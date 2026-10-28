package httpapi

import (
	"net/http"
	"time"

	"github.com/cyrusxyz/touqi/backend-go/internal/model"
	"github.com/gin-gonic/gin"
)

// requireAdmin 统一执行管理员检查，保留旧 API 的英文错误 detail 以兼容客户端。
func (s *Server) requireAdmin(c *gin.Context) bool {
	user := userFrom(c)
	if user == nil || !user.IsAdmin {
		Error(c, http.StatusForbidden, "Only admins can do this")
		return false
	}
	return true
}

// userBasic 只返回允许出现在列表和消息中的公开用户字段。
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

// loadUser 是旧版 handler 使用的单条用户查询。批量列表接口不应在循环中调用它。
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
