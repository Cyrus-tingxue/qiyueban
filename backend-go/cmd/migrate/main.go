package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/cyrusxyz/touqi/backend-go/internal/config"
	"github.com/cyrusxyz/touqi/backend-go/internal/db"
)

// main 仅执行显式 SQL migration，不调用 GORM AutoMigrate，也不会主动删除或重建业务表。
func main() {
	cfg := config.Load()
	database, err := db.Open(cfg)
	if err != nil {
		log.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	conn, err := database.DB()
	if err != nil {
		log.Fatal(err)
	}
	if err := conn.PingContext(ctx); err != nil {
		log.Fatal(err)
	}
	path := os.Getenv("MIGRATION_FILE")
	if path == "" {
		path = "/app/migrations/0001_baseline.sql"
	}
	if _, err := os.Stat(filepath.Clean(path)); err != nil {
		log.Fatalf("migration file is unavailable: %v", err)
	}
	content, err := os.ReadFile(path)
	if err != nil {
		log.Fatal(err)
	}
	if err := database.Exec(string(content)).Error; err != nil {
		log.Fatalf("apply migration: %v", err)
	}
	fmt.Println("database migration 0001 applied")
}
