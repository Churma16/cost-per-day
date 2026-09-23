package sqlite

import (
	"database/sql"
	"fmt"

	sqlitegorm "gosqlite.org/gorm"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// NewGORM initializes GORM on top of the existing pre-configured SQLite pool.
//
// The maintained CGo-free SQLite dialector reuses the established *sql.DB,
// preserving WAL mode, foreign keys, busy timeout, connection limits, and the
// existing explicit migration lifecycle. AutoMigrate is intentionally not used.
func NewGORM(databaseConnection *sql.DB) (*gorm.DB, error) {
	if databaseConnection == nil {
		return nil, fmt.Errorf("database connection is required")
	}

	dialector := sqlitegorm.New(sqlitegorm.Config{
		Conn: databaseConnection,
	})

	gormDB, openError := gorm.Open(dialector, &gorm.Config{
		Logger:         logger.Default.LogMode(logger.Silent),
		TranslateError: true,
	})
	if openError != nil {
		return nil, fmt.Errorf("open gorm sqlite database: %w", openError)
	}

	return gormDB, nil
}
