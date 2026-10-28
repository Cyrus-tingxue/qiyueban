package httpapi

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func Error(c *gin.Context, status int, detail string) { c.JSON(status, gin.H{"detail": detail}) }
func Detail(c *gin.Context, detail string)            { c.JSON(http.StatusOK, gin.H{"detail": detail}) }
