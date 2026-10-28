package httpapi

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Error 返回旧客户端约定的统一错误体。不要直接返回 GORM 错误，避免泄露 SQL 和内部字段。
func Error(c *gin.Context, status int, detail string) {
	c.JSON(status, gin.H{"detail": detail})
}

// Detail 返回成功操作的统一提示体。
func Detail(c *gin.Context, detail string) {
	c.JSON(http.StatusOK, gin.H{"detail": detail})
}
