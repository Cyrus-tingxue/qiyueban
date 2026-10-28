package httpapi

import (
	"strconv"
	"strings"
	"time"

	"github.com/cyrusxyz/touqi/backend-go/internal/model"
	"github.com/gin-gonic/gin"
)

// notifications 返回普通通知流；group_invite 由群邀请接口单独处理，以保持前端分类展示。
func (s *Server) notifications(c *gin.Context) {
	user := userFrom(c)
	skip := parseNonNegative(c.Query("skip"), 0)
	limit := parseBounded(c.Query("limit"), 20, 1, 100)
	var total, unread int64
	s.DB.Model(&model.Notification{}).Where("receiver_id = ? AND type <> ?", user.ID, "group_invite").Count(&total)
	s.DB.Model(&model.Notification{}).Where("receiver_id = ? AND type <> ? AND is_read = ?", user.ID, "group_invite", false).Count(&unread)
	var rows []model.Notification
	s.DB.Where("receiver_id = ? AND type <> ?", user.ID, "group_invite").Order("created_at desc,id desc").Offset(skip).Limit(limit).Find(&rows)
	out := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		out = append(out, gin.H{"id": row.ID, "sender_id": row.SenderID, "sender_name": row.SenderName, "sender_avatar": row.SenderAvatar, "type": row.Type, "target_id": row.TargetID, "post_id": row.PostID, "is_read": row.IsRead, "created_at": formatTimeValue(row.CreatedAt)})
	}
	c.JSON(200, gin.H{"items": out, "total": total, "unread_count": unread})
}
func (s *Server) unreadNotifications(c *gin.Context) {
	user := userFrom(c)
	var count int64
	s.DB.Model(&model.Notification{}).Where("receiver_id = ? AND type <> ? AND is_read = ?", user.ID, "group_invite", false).Count(&count)
	c.JSON(200, gin.H{"unread_count": count})
}
func (s *Server) readNotification(c *gin.Context) {
	user := userFrom(c)
	var row model.Notification
	if s.DB.Where("id = ? AND receiver_id = ?", c.Param("id"), user.ID).First(&row).Error != nil {
		Error(c, 404, "消息不存在")
		return
	}
	s.DB.Model(&row).Update("is_read", true)
	Detail(c, "已读")
}
func (s *Server) readAllNotifications(c *gin.Context) {
	user := userFrom(c)
	s.DB.Model(&model.Notification{}).Where("receiver_id = ? AND type <> ? AND is_read = ?", user.ID, "group_invite", false).Update("is_read", true)
	Detail(c, "全部已读")
}
func (s *Server) clearNotifications(c *gin.Context) {
	user := userFrom(c)
	q := s.DB.Where("receiver_id = ? AND type <> ?", user.ID, "group_invite")
	if c.GetString("kind") == "read" {
		q = q.Where("is_read = ?", true)
	}
	var rows []model.Notification
	q.Find(&rows)
	for _, row := range rows {
		s.DB.Delete(&row)
	}
	c.JSON(200, gin.H{"detail": map[string]string{"read": "已清除所有已读消息", "all": "已全部清空"}[c.GetString("kind")], "deleted_count": len(rows)})
}
func (s *Server) friends(c *gin.Context) {
	user := userFrom(c)
	var rows []model.Friendship
	s.DB.Where("status = ? AND (requester_id = ? OR addressee_id = ?)", "accepted", user.ID, user.ID).Order("accepted_at desc,created_at desc").Find(&rows)
	out := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		id := row.AddresseeID
		if id == user.ID {
			id = row.RequesterID
		}
		out = append(out, gin.H{"friend": userBasic(s.loadUser(id), true), "friendship_id": row.ID, "since": formatTimeValue(valueTime(row.AcceptedAt, row.CreatedAt))})
	}
	c.JSON(200, out)
}
func (s *Server) friendRequests(c *gin.Context) {
	user := userFrom(c)
	var rows []model.Friendship
	s.DB.Where("status = ? AND (requester_id = ? OR addressee_id = ?)", "pending", user.ID, user.ID).Order("created_at desc").Find(&rows)
	out := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		out = append(out, gin.H{"id": row.ID, "status": row.Status, "created_at": formatTimeValue(row.CreatedAt), "requester": userBasic(s.loadUser(row.RequesterID), true), "addressee": userBasic(s.loadUser(row.AddresseeID), true), "direction": map[bool]string{true: "incoming", false: "outgoing"}[row.AddresseeID == user.ID]})
	}
	c.JSON(200, out)
}

// sendFriendRequest 创建或重置好友申请，并通知目标用户。
func (s *Server) sendFriendRequest(c *gin.Context) {
	user := userFrom(c)
	var in struct {
		UserID uint `json:"user_id"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	if in.UserID == user.ID {
		Error(c, 400, "不能添加自己为好友")
		return
	}
	if s.loadUser(in.UserID) == nil {
		Error(c, 404, "用户不存在")
		return
	}
	var row model.Friendship
	err := s.DB.Where("(requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)", user.ID, in.UserID, in.UserID, user.ID).First(&row).Error
	if err == nil {
		if row.Status == "accepted" {
			Error(c, 400, "你们已经是好友了")
			return
		}
		if row.Status == "pending" && row.RequesterID != user.ID {
			Error(c, 400, "对方已向你发来好友申请")
			return
		}
		row.RequesterID = user.ID
		row.AddresseeID = in.UserID
		row.Status = "pending"
		row.CreatedAt = time.Now().UTC()
		s.DB.Save(&row)
	} else {
		row = model.Friendship{RequesterID: user.ID, AddresseeID: in.UserID, Status: "pending", CreatedAt: time.Now().UTC()}
		s.DB.Create(&row)
	}
	name := user.Nickname
	target := row.ID
	s.DB.Create(&model.Notification{ReceiverID: in.UserID, SenderID: &user.ID, SenderName: &name, Type: "friend_request", TargetID: &target})
	c.JSON(200, gin.H{"id": row.ID, "status": row.Status, "created_at": formatTimeValue(row.CreatedAt), "requester": userBasic(user, true), "addressee": userBasic(s.loadUser(in.UserID), true), "direction": "outgoing"})
}
func (s *Server) respondFriend(c *gin.Context) {
	user := userFrom(c)
	var row model.Friendship
	if s.DB.First(&row, c.Param("id")).Error != nil {
		Error(c, 404, "好友申请不存在")
		return
	}
	if row.AddresseeID != user.ID {
		Error(c, 403, "无权处理该好友申请")
		return
	}
	accept := c.Param("action") == "accept"
	if accept {
		row.Status = "accepted"
		now := time.Now().UTC()
		row.AcceptedAt = &now
	} else {
		row.Status = "rejected"
		row.AcceptedAt = nil
	}
	s.DB.Save(&row)
	s.DB.Model(&model.Notification{}).Where("type = ? AND target_id = ? AND receiver_id = ?", "friend_request", row.ID, user.ID).Update("is_read", true)
	c.JSON(200, gin.H{"id": row.ID, "status": row.Status, "created_at": formatTimeValue(row.CreatedAt), "requester": userBasic(s.loadUser(row.RequesterID), true), "addressee": userBasic(s.loadUser(row.AddresseeID), true), "direction": "incoming"})
}
func (s *Server) removeFriend(c *gin.Context) {
	user := userFrom(c)
	var row model.Friendship
	if s.DB.Where("status = ? AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))", "accepted", user.ID, c.Param("id"), c.Param("id"), user.ID).First(&row).Error != nil {
		Error(c, 404, "好友关系不存在")
		return
	}
	s.DB.Delete(&row)
	Detail(c, "success")
}

// messages 只允许已建立好友关系的用户发送私聊消息。
func (s *Server) messages(c *gin.Context) {
	user := userFrom(c)
	var in struct {
		ReceiverID uint   `json:"receiver_id"`
		Content    string `json:"content"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	if s.loadUser(in.ReceiverID) == nil {
		Error(c, 404, "接收方不存在")
		return
	}
	if !s.areFriends(user.ID, in.ReceiverID) {
		Error(c, 403, "你们还不是好友")
		return
	}
	row := model.Message{SenderID: user.ID, ReceiverID: in.ReceiverID, Content: strings.TrimSpace(in.Content)}
	s.DB.Create(&row)
	c.JSON(200, s.messageResponse(&row))
}
func (s *Server) messageResponse(row *model.Message) gin.H {
	return gin.H{"id": row.ID, "sender_id": row.SenderID, "receiver_id": row.ReceiverID, "content": row.Content, "is_read": row.IsRead, "created_at": formatTimeValue(row.CreatedAt), "sender": userBasic(s.loadUser(row.SenderID), true), "receiver": userBasic(s.loadUser(row.ReceiverID), true)}
}
func (s *Server) areFriends(a, b uint) bool {
	var row model.Friendship
	return s.DB.Where("status = ? AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))", "accepted", a, b, b, a).First(&row).Error == nil
}

// conversationMessages 读取会话并把对方发来的未读消息标记为已读；结果按时间正序返回。
func (s *Server) conversationMessages(c *gin.Context) {
	user := userFrom(c)
	other := c.Param("id")
	limit := parseBounded(c.Query("limit"), 50, 1, 100)
	skip := parseNonNegative(c.Query("skip"), 0)
	s.DB.Model(&model.Message{}).Where("receiver_id = ? AND sender_id = ? AND is_read = ? AND receiver_deleted_at IS NULL", user.ID, other, false).Update("is_read", true)
	var rows []model.Message
	s.DB.Where("((sender_id = ? AND receiver_id = ? AND sender_deleted_at IS NULL) OR (sender_id = ? AND receiver_id = ? AND receiver_deleted_at IS NULL))", user.ID, other, other, user.ID).Order("created_at desc,id desc").Offset(skip).Limit(limit).Find(&rows)
	for i, j := 0, len(rows)-1; i < j; i, j = i+1, j-1 {
		rows[i], rows[j] = rows[j], rows[i]
	}
	out := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		out = append(out, s.messageResponse(&row))
	}
	c.JSON(200, out)
}
func (s *Server) readMessages(c *gin.Context) {
	user := userFrom(c)
	var result struct{ Count int64 }
	s.DB.Model(&model.Message{}).Where("receiver_id = ? AND sender_id = ? AND is_read = ? AND receiver_deleted_at IS NULL", user.ID, c.Param("id"), false).Updates(map[string]any{"is_read": true}).Count(&result.Count)
	c.JSON(200, gin.H{"status": "success", "marked_read_count": result.Count})
}

// deleteConversation 只设置当前用户一侧的软删除时间；双方都删除后才物理清理消息。
func (s *Server) deleteConversation(c *gin.Context) {
	user := userFrom(c)
	now := time.Now().UTC()
	s.DB.Model(&model.Message{}).Where("sender_id = ? AND receiver_id = ? AND sender_deleted_at IS NULL", user.ID, c.Param("id")).Update("sender_deleted_at", now)
	s.DB.Model(&model.Message{}).Where("sender_id = ? AND receiver_id = ? AND receiver_deleted_at IS NULL", c.Param("id"), user.ID).Update("receiver_deleted_at", now)
	s.DB.Where("((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND sender_deleted_at IS NOT NULL AND receiver_deleted_at IS NOT NULL", user.ID, c.Param("id"), c.Param("id"), user.ID).Delete(&model.Message{})
	c.JSON(200, gin.H{"status": "success"})
}
func (s *Server) conversations(c *gin.Context) {
	user := userFrom(c)
	limit := parseBounded(c.Query("limit"), 20, 1, 100)
	skip := parseNonNegative(c.Query("skip"), 0)
	var rows []model.Message
	s.DB.Where("(sender_id = ? AND sender_deleted_at IS NULL) OR (receiver_id = ? AND receiver_deleted_at IS NULL)", user.ID, user.ID).Order("created_at desc,id desc").Offset(skip).Limit(limit * 5).Find(&rows)
	seen := map[uint]bool{}
	out := []gin.H{}
	for _, row := range rows {
		other := row.SenderID
		if other == user.ID {
			other = row.ReceiverID
		}
		if seen[other] {
			continue
		}
		seen[other] = true
		var count int64
		s.DB.Model(&model.Message{}).Where("sender_id = ? AND receiver_id = ? AND is_read = ? AND receiver_deleted_at IS NULL", other, user.ID, false).Count(&count)
		out = append(out, gin.H{"with_user": userBasic(s.loadUser(other), true), "last_message": s.messageResponse(&row), "unread_count": count})
		if len(out) >= limit {
			break
		}
	}
	c.JSON(200, out)
}
func (s *Server) unreadMessages(c *gin.Context) {
	user := userFrom(c)
	var count int64
	s.DB.Model(&model.Message{}).Where("receiver_id = ? AND is_read = ? AND receiver_deleted_at IS NULL", user.ID, false).Count(&count)
	c.JSON(200, gin.H{"unread_count": count})
}
func parseNonNegative(value string, fallback int) int {
	n, err := strconv.Atoi(value)
	if err != nil || n < 0 {
		return fallback
	}
	return n
}
func valueTime(pointer *time.Time, fallback time.Time) time.Time {
	if pointer != nil {
		return *pointer
	}
	return fallback
}
