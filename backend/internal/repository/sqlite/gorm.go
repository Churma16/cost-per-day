package sqlite

import (
	"database/sql"
	"fmt"

	gormsqlite "gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// NewGORM initializes GORM on top of the existing pre-configured SQLite pool.
//
// The maintained GORM SQLite dialector is given the existing *sql.DB directly,
// so runtime SQLite I/O continues through modernc.org/sqlite. This preserves
// WAL mode, foreign keys, busy timeout, connection limits, and the existing
// explicit migration lifecycle without introducing AutoMigrate.
func NewGORM(databaseConnection *sql.DB) (*gorm.DB, error) {
	if databaseConnection == nil {
		return nil, fmt.Errorf("database connection is required")
	}

	dialector := gormsqlite.New(gormsqlite.Config{
		Conn: databaseConnection,
	})

	gormDB, openError := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if openError != nil {
		return nil, fmt.Errorf("open gorm sqlite database: %w", openError)
	}

	return gormDB, nil
}
