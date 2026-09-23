package sqlite

import (
	"database/sql"
	"fmt"
	"strconv"

	"gorm.io/gorm"
	"gorm.io/gorm/callbacks"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/migrator"
	"gorm.io/gorm/schema"
)

// sqliteDialector connects GORM directly to an existing pure-Go modernc.org/sqlite *sql.DB pool.
// This keeps the persistence layer 100% CGO-free and avoids driver name collisions.
type sqliteDialector struct {
	Conn gorm.ConnPool
}

func (dialector sqliteDialector) Name() string {
	return "sqlite"
}

func (dialector sqliteDialector) Initialize(db *gorm.DB) error {
	if dialector.Conn != nil {
		db.ConnPool = dialector.Conn
	}

	callbacks.RegisterDefaultCallbacks(db, &callbacks.Config{
		LastInsertIDReversed: true,
	})

	for clauseName, clauseBuilder := range dialector.ClauseBuilders() {
		db.ClauseBuilders[clauseName] = clauseBuilder
	}
	return nil
}

func (dialector sqliteDialector) ClauseBuilders() map[string]clause.ClauseBuilder {
	return map[string]clause.ClauseBuilder{
		"INSERT": func(c clause.Clause, builder clause.Builder) {
			if insert, ok := c.Expression.(clause.Insert); ok {
				if stmt, ok := builder.(*gorm.Statement); ok {
					stmt.WriteString("INSERT ")
					if insert.Modifier != "" {
						stmt.WriteString(insert.Modifier)
						stmt.WriteByte(' ')
					}

					stmt.WriteString("INTO ")
					if insert.Table.Name == "" {
						stmt.WriteQuoted(stmt.Table)
					} else {
						stmt.WriteQuoted(insert.Table)
					}
					return
				}
			}

			c.Build(builder)
		},
		"LIMIT": func(c clause.Clause, builder clause.Builder) {
			if limit, ok := c.Expression.(clause.Limit); ok {
				var limitValue = -1
				if limit.Limit != nil && *limit.Limit >= 0 {
					limitValue = *limit.Limit
				}
				if limitValue >= 0 || limit.Offset > 0 {
					builder.WriteString("LIMIT ")
					builder.WriteString(strconv.Itoa(limitValue))
				}
				if limit.Offset > 0 {
					builder.WriteString(" OFFSET ")
					builder.WriteString(strconv.Itoa(limit.Offset))
				}
			}
		},
		"FOR": func(c clause.Clause, builder clause.Builder) {
			if _, ok := c.Expression.(clause.Locking); ok {
				// SQLite does not support row-level locking.
				return
			}
			c.Build(builder)
		},
	}
}

func (dialector sqliteDialector) DefaultValueOf(field *schema.Field) clause.Expression {
	if field.AutoIncrement {
		return clause.Expr{SQL: "NULL"}
	}
	return clause.Expr{SQL: "DEFAULT"}
}

func (dialector sqliteDialector) Migrator(db *gorm.DB) gorm.Migrator {
	return migrator.Migrator{Config: migrator.Config{
		DB:        db,
		Dialector: dialector,
	}}
}

func (dialector sqliteDialector) BindVarTo(writer clause.Writer, stmt *gorm.Statement, value any) {
	writer.WriteByte('?')
}

func (dialector sqliteDialector) QuoteTo(writer clause.Writer, rawString string) {
	var (
		underQuoted, selfQuoted bool
		continuousBacktick      int8
		shiftDelimiter          int8
	)

	for _, character := range []byte(rawString) {
		switch character {
		case '`':
			continuousBacktick++
			if continuousBacktick == 2 {
				writer.WriteString("``")
				continuousBacktick = 0
			}
		case '.':
			if continuousBacktick > 0 || !selfQuoted {
				shiftDelimiter = 0
				underQuoted = false
				continuousBacktick = 0
				writer.WriteString("`")
			}
			writer.WriteByte(character)
			continue
		default:
			if shiftDelimiter-continuousBacktick <= 0 && !underQuoted {
				writer.WriteString("`")
				underQuoted = true
				if selfQuoted = continuousBacktick > 0; selfQuoted {
					continuousBacktick -= 1
				}
			}

			for ; continuousBacktick > 0; continuousBacktick -= 1 {
				writer.WriteString("``")
			}

			writer.WriteByte(character)
		}
		shiftDelimiter++
	}

	if continuousBacktick > 0 && !selfQuoted {
		writer.WriteString("``")
	}
	writer.WriteString("`")
}

func (dialector sqliteDialector) Explain(sqlStatement string, variables ...any) string {
	return logger.ExplainSQL(sqlStatement, nil, `"`, variables...)
}

func (dialector sqliteDialector) DataTypeOf(field *schema.Field) string {
	switch field.DataType {
	case schema.Bool:
		return "numeric"
	case schema.Int, schema.Uint:
		if field.AutoIncrement {
			return "integer PRIMARY KEY AUTOINCREMENT"
		}
		return "integer"
	case schema.Float:
		return "real"
	case schema.String:
		return "text"
	case schema.Time:
		return "text"
	case schema.Bytes:
		return "blob"
	}
	return string(field.DataType)
}

func (dialector sqliteDialector) SavePoint(transaction *gorm.DB, savepointName string) error {
	transaction.Exec("SAVEPOINT " + savepointName)
	return nil
}

func (dialector sqliteDialector) RollbackTo(transaction *gorm.DB, savepointName string) error {
	transaction.Exec("ROLLBACK TO SAVEPOINT " + savepointName)
	return nil
}

// NewGORM initializes a GORM database instance attached to an existing, pre-configured SQLite connection.
//
// It re-uses the established *sql.DB pool, foreign key enforcement, WAL mode,
// busy timeout, connection limits, and explicit schema migrations.
// GORM AutoMigrate is intentionally omitted to ensure schema evolution is driven
// exclusively by the embedded SQL migrations and PRAGMA user_version.
func NewGORM(databaseConnection *sql.DB) (*gorm.DB, error) {
	if databaseConnection == nil {
		return nil, fmt.Errorf("database connection is required")
	}

	dialector := sqliteDialector{
		Conn: databaseConnection,
	}

	gormConfig := &gorm.Config{
		Logger:         logger.Default.LogMode(logger.Silent),
		TranslateError: true,
	}

	gormDB, openError := gorm.Open(dialector, gormConfig)
	if openError != nil {
		return nil, fmt.Errorf("open gorm sqlite database: %w", openError)
	}

	return gormDB, nil
}
