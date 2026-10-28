package httpapi

import (
	"net/http"
	"time"

	"github.com/cyrusxyz/touqi/backend-go/internal/model"
	"github.com/gin-gonic/gin"
)

func (s *Server) requireAdmin(c *gin.Context) bool {
	user := userFrom(c)
	if user == nil || !user.IsAdmin {
		Error(c, http.StatusForbidden, "Only admins can do this")
		return false
	}
	return true
}

func userBasic(user *model.User, presence bool) gin.H {
	if user == nil {
		return gin.H{"uid": 0, "username": "deleted", "nickname": "已删除用户", "avatar": "eye"}
	}
	out := gin.H{"uid": user.ID, "username": user.Username, "nickname": user.Nickname, "avatar": valueOr(user.Avatar, "eye")}
	if presence {
		out["is_online"] = user.LastSeenAt != nil && time.Since(*user.LastSeenAt) <= 45*time.Second
		out["last_seen_at"] = formatTime(user.LastSeenAt)
	}
	return out
}

func (s *Server) loadUser(id uint) *model.User {
	var user model.User
	if s.DB.First(&user, id).Error != nil {
		return nil
	}
	return &user
}
func uintPtr(v uint) *uint           { return &v }
func strPtr(v string) *string        { return &v }
func timePtr(v time.Time) *time.Time { return &v }
