package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
)

// Config 汇总 Go API 运行所需的环境变量。
//
// 字段名称与旧 FastAPI 配置保持对应，便于本地和云端继续复用同一个 .env。
type Config struct {
	Port                     string
	DatabaseURL              string
	SecretKey                string
	AccessTokenExpireMinutes int
	CORSOrigins              []string
	FrontendURL              string
	UploadDir                string
	SMTPHost                 string
	SMTPPort                 int
	SMTPUsername             string
	SMTPPassword             string
	SMTPFrom                 string
	SMTPUseTLS               bool
	AnthropicAuthToken       string
	AnthropicBaseURL         string
	AnthropicModel           string
}

// Load 从环境变量读取配置。生产环境应显式设置 SECRET_KEY，避免使用开发默认值。
func Load() Config {
	return Config{
		Port:                     get("PORT", "80"),
		DatabaseURL:              databaseURL(),
		SecretKey:                get("SECRET_KEY", "touqi-secret-key-change-in-production"),
		AccessTokenExpireMinutes: getInt("ACCESS_TOKEN_EXPIRE_MINUTES", 1440),
		CORSOrigins:              split(get("CORS_ORIGINS", "http://localhost")),
		FrontendURL:              get("FRONTEND_URL", "http://localhost"),
		UploadDir:                get("UPLOAD_DIR", "/app/data/uploads"),
		SMTPHost:                 os.Getenv("SMTP_HOST"),
		SMTPPort:                 getInt("SMTP_PORT", 587),
		SMTPUsername:             os.Getenv("SMTP_USERNAME"),
		SMTPPassword:             os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:                 os.Getenv("SMTP_FROM"),
		SMTPUseTLS:               getBool("SMTP_USE_TLS", true),
		AnthropicAuthToken:       os.Getenv("ANTHROPIC_AUTH_TOKEN"),
		AnthropicBaseURL:         os.Getenv("ANTHROPIC_BASE_URL"),
		AnthropicModel:           os.Getenv("ANTHROPIC_MODEL"),
	}
}

// databaseURL 同时接受旧 Python 使用的 postgresql+psycopg URL 和 Go 驱动使用的 postgres URL。
func databaseURL() string {
	if v := os.Getenv("DATABASE_URL"); v != "" {
		v = strings.TrimPrefix(v, "postgresql+psycopg://")
		v = strings.TrimPrefix(v, "postgresql://")
		if !strings.HasPrefix(v, "postgres://") {
			return "postgres://" + v
		}
		return v
	}
	user := get("POSTGRES_USER", "touqi")
	password := get("POSTGRES_PASSWORD", "touqi_change_me")
	db := get("POSTGRES_DB", "touqi")
	host := get("POSTGRES_HOST", "postgres")
	port := get("POSTGRES_PORT", "5432")
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", url.QueryEscape(user), url.QueryEscape(password), host, port, db)
}

// get 返回环境变量；缺省值只用于本地开发，敏感配置不应依赖缺省值。
func get(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
func getInt(key string, fallback int) int {
	v, err := strconv.Atoi(get(key, strconv.Itoa(fallback)))
	if err != nil {
		return fallback
	}
	return v
}
func getBool(key string, fallback bool) bool {
	v := strings.ToLower(get(key, strconv.FormatBool(fallback)))
	return v == "1" || v == "true" || v == "yes"
}
func split(v string) []string {
	var out []string
	for _, item := range strings.Split(v, ",") {
		item = strings.TrimSpace(item)
		if item != "" {
			out = append(out, item)
		}
	}
	return out
}
