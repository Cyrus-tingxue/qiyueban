package db

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"gorm.io/gorm"
)

// ApplyBaseline records the schema baseline without AutoMigrate or destructive DDL.
// Existing deployments must execute migrations/0001_baseline.sql once using psql.
func ApplyBaseline(database *gorm.DB, migrationDir string) error {
	path := filepath.Join(migrationDir, "0001_baseline.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read baseline migration: %w", err)
	}
	return database.Exec(string(content)).Error
}

func MigrationVersion(filename string) (int64, error) {
	parts := strings.SplitN(filepath.Base(filename), "_", 2)
	if len(parts) < 2 {
		return 0, fmt.Errorf("invalid migration filename: %s", filename)
	}
	return strconv.ParseInt(parts[0], 10, 64)
}
