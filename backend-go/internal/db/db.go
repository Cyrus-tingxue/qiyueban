package db

import (
	"context"
	"fmt"
	"time"

	"github.com/cyrusxyz/touqi/backend-go/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Open 创建共享的 GORM 连接，并设置连接池上限。
//
// Schema 由显式 SQL migration 管理，这里刻意不调用 AutoMigrate，避免服务
// 启动时对生产表结构做不可预期的修改。
func Open(cfg config.Config) (*gorm.DB, error) {
	database, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	sqlDB, err := database.DB()
	if err != nil {
		return nil, fmt.Errorf("get database handle: %w", err)
	}
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	return database, nil
}

// Ping 在启动或健康检查时验证数据库连接是否可用。
func Ping(ctx context.Context, database *gorm.DB) error {
	sqlDB, err := database.DB()
	if err != nil {
		return err
	}
	return sqlDB.PingContext(ctx)
}
