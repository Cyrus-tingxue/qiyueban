package httpapi

import (
	"net/http"
	"strings"
	"time"

	"github.com/cyrusxyz/touqi/backend-go/internal/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func (s *Server) groupInvites(c *gin.Context) {
	user := userFrom(c)
	var rows []model.ChatGroupInvite
	s.DB.Where("invitee_id = ? AND status = ?", user.ID, "pending").Order("created_at desc").Find(&rows)
	out := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		out = append(out, s.groupInviteResponse(&row))
	}
	c.JSON(200, out)
}
func (s *Server) groupInviteResponse(row *model.ChatGroupInvite) gin.H {
	var group model.ChatGroup
	var inviter, invitee model.User
	s.DB.First(&group, row.GroupID)
	s.DB.First(&inviter, row.InviterID)
	s.DB.First(&invitee, row.InviteeID)
	return gin.H{"id": row.ID, "status": row.Status, "created_at": formatTimeValue(row.CreatedAt), "group_id": row.GroupID, "group_name": group.Name, "inviter": userBasic(&inviter, true), "invitee": userBasic(&invitee, true)}
}
func (s *Server) respondGroupInvite(c *gin.Context) {
	user := userFrom(c)
	var row model.ChatGroupInvite
	if s.DB.Where("id = ? AND status = ?", c.Param("id"), "pending").First(&row).Error != nil {
		Error(c, 404, "群加入邀请不存在")
		return
	}
	if row.InviteeID != user.ID {
		Error(c, 403, "无权处理该邀请")
		return
	}
	accept := c.Param("action") == "accept"
	now := time.Now().UTC()
	if accept {
		var member model.ChatGroupMember
		if s.DB.Where("group_id = ? AND user_id = ?", row.GroupID, user.ID).First(&member).Error != nil {
			member = model.ChatGroupMember{GroupID: row.GroupID, UserID: user.ID, InvitedByID: &row.InviterID, JoinedAt: now}
			s.DB.Create(&member)
		}
		row.Status = "accepted"
	} else {
		row.Status = "rejected"
	}
	row.RespondedAt = &now
	s.DB.Save(&row)
	s.DB.Model(&model.Notification{}).Where("type = ? AND target_id = ? AND receiver_id = ?", "group_invite", row.ID, user.ID).Update("is_read", true)
	c.JSON(200, s.groupInviteResponse(&row))
}
func (s *Server) listGroups(c *gin.Context) {
	user := userFrom(c)
	var groups []model.ChatGroup
	s.DB.Order("created_at desc").Find(&groups)
	out := make([]gin.H, 0, len(groups))
	for _, group := range groups {
		out = append(out, s.groupSummary(&group, user.ID, false))
	}
	c.JSON(200, out)
}
func (s *Server) groupSummary(group *model.ChatGroup, userID uint, detail bool) gin.H {
	var count int64
	s.DB.Model(&model.ChatGroupMember{}).Where("group_id = ?", group.ID).Count(&count)
	var member model.ChatGroupMember
	ismember := s.DB.Where("group_id = ? AND user_id = ?", group.ID, userID).First(&member).Error == nil
	var latest model.GroupMessage
	s.DB.Where("group_id = ?", group.ID).Order("id desc").First(&latest)
	out := gin.H{"id": group.ID, "name": group.Name, "is_public": group.IsPublic, "member_count": count, "is_member": ismember, "unread_count": 0, "created_at": formatTimeValue(group.CreatedAt), "creator": userBasic(s.loadUser(group.CreatorID), group.CreatorID == userID), "last_message": nil}
	if latest.ID > 0 {
		out["last_message"] = s.groupMessageResponse(&latest)
	}
	if ismember {
		var unread int64
		s.DB.Model(&model.GroupMessage{}).Where("group_id = ? AND id > ? AND sender_id <> ?", group.ID, valueOrUint(member.LastReadMessageID), userID).Count(&unread)
		out["unread_count"] = unread
	}
	if detail {
		var members []model.ChatGroupMember
		s.DB.Where("group_id = ?", group.ID).Order("joined_at asc").Find(&members)
		list := make([]gin.H, 0, len(members))
		for _, item := range members {
			list = append(list, userBasic(s.loadUser(item.UserID), true))
		}
		out["members"] = list
	}
	return out
}
func (s *Server) createGroup(c *gin.Context) {
	user := userFrom(c)
	var in struct {
		Name      string `json:"name"`
		MemberIDs []uint `json:"member_ids"`
		IsPublic  bool   `json:"is_public"`
	}
	if c.ShouldBindJSON(&in) != nil || strings.TrimSpace(in.Name) == "" {
		Error(c, 400, "群聊名称不能为空")
		return
	}
	now := time.Now().UTC()
	group := model.ChatGroup{Name: strings.TrimSpace(in.Name), CreatorID: user.ID, IsPublic: in.IsPublic, CreatedAt: now}
	tx := s.DB.Begin()
	if err := tx.Create(&group).Error; err != nil {
		tx.Rollback()
		Error(c, 400, "创建群聊失败")
		return
	}
	tx.Create(&model.ChatGroupMember{GroupID: group.ID, UserID: user.ID, InvitedByID: &user.ID, JoinedAt: now})
	for _, id := range uniqueIDs(in.MemberIDs) {
		if id == user.ID || !s.areFriends(user.ID, id) {
			continue
		}
		if s.loadUser(id) != nil {
			tx.Create(&model.ChatGroupMember{GroupID: group.ID, UserID: id, InvitedByID: &user.ID, JoinedAt: now})
		}
	}
	tx.Commit()
	c.JSON(200, s.groupSummary(&group, user.ID, true))
}
func (s *Server) groupDetail(c *gin.Context) {
	user := userFrom(c)
	var group model.ChatGroup
	if s.DB.First(&group, c.Param("id")).Error != nil {
		Error(c, 404, "群聊不存在")
		return
	}
	c.JSON(200, s.groupSummary(&group, user.ID, true))
}
func (s *Server) joinGroup(c *gin.Context) {
	user := userFrom(c)
	var group model.ChatGroup
	if s.DB.First(&group, c.Param("id")).Error != nil {
		Error(c, 404, "群聊不存在")
		return
	}
	if !group.IsPublic {
		Error(c, 403, "该群聊不可直接加入")
		return
	}
	var member model.ChatGroupMember
	if s.DB.Where("group_id = ? AND user_id = ?", group.ID, user.ID).First(&member).Error != nil {
		s.DB.Create(&model.ChatGroupMember{GroupID: group.ID, UserID: user.ID, JoinedAt: time.Now().UTC()})
	}
	c.JSON(200, s.groupSummary(&group, user.ID, true))
}
func (s *Server) leaveGroup(c *gin.Context) {
	user := userFrom(c)
	var member model.ChatGroupMember
	if s.DB.Where("group_id = ? AND user_id = ?", c.Param("id"), user.ID).First(&member).Error != nil {
		Error(c, 404, "你不在这个群聊中")
		return
	}
	s.DB.Delete(&member)
	c.JSON(200, gin.H{"status": "success"})
}
func (s *Server) inviteGroupMember(c *gin.Context) {
	user := userFrom(c)
	var in struct {
		UserID uint `json:"user_id"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	var member model.ChatGroupMember
	if s.DB.Where("group_id = ? AND user_id = ?", c.Param("id"), user.ID).First(&member).Error != nil {
		Error(c, 403, "你不在这个群聊中")
		return
	}
	if in.UserID == user.ID {
		Error(c, 400, "不能邀请自己入群")
		return
	}
	if !s.areFriends(user.ID, in.UserID) {
		Error(c, 403, "只能邀请好友入群")
		return
	}
	var existing model.ChatGroupMember
	if s.DB.Where("group_id = ? AND user_id = ?", c.Param("id"), in.UserID).First(&existing).Error == nil {
		Error(c, 400, "对方已在群组中")
		return
	}
	var invite model.ChatGroupInvite
	if s.DB.Where("group_id = ? AND invitee_id = ? AND status = ?", c.Param("id"), in.UserID, "pending").First(&invite).Error == nil {
		c.JSON(200, s.groupInviteResponse(&invite))
		return
	}
	inviter := user.Nickname
	invite = model.ChatGroupInvite{GroupID: uint(parsePositive(c.Param("id"), 0)), InviterID: user.ID, InviteeID: in.UserID, Status: "pending", CreatedAt: time.Now().UTC()}
	s.DB.Create(&invite)
	target := invite.ID
	s.DB.Create(&model.Notification{ReceiverID: in.UserID, SenderID: &user.ID, SenderName: &inviter, Type: "group_invite", TargetID: &target})
	c.JSON(200, s.groupInviteResponse(&invite))
}
func (s *Server) groupMessages(c *gin.Context) {
	user := userFrom(c)
	groupID := uint(parsePositive(c.Param("id"), 0))
	var member model.ChatGroupMember
	if s.DB.Where("group_id = ? AND user_id = ?", groupID, user.ID).First(&member).Error != nil {
		Error(c, 403, "你不在这个群聊中")
		return
	}
	limit := parseBounded(c.Query("limit"), 100, 1, 200)
	skip := parseNonNegative(c.Query("skip"), 0)
	var rows []model.GroupMessage
	s.DB.Where("group_id = ?", groupID).Order("id desc").Offset(skip).Limit(limit).Find(&rows)
	for i, j := 0, len(rows)-1; i < j; i, j = i+1, j-1 {
		rows[i], rows[j] = rows[j], rows[i]
	}
	if len(rows) > 0 {
		s.DB.Model(&member).Update("last_read_message_id", rows[len(rows)-1].ID)
	}
	out := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		out = append(out, s.groupMessageResponse(&row))
	}
	c.JSON(200, out)
}
func (s *Server) groupMessageResponse(row *model.GroupMessage) gin.H {
	return gin.H{"id": row.ID, "group_id": row.GroupID, "content": row.Content, "created_at": formatTimeValue(row.CreatedAt), "sender_id": row.SenderID, "sender": userBasic(s.loadUser(row.SenderID), true)}
}
func (s *Server) sendGroupMessage(c *gin.Context) {
	user := userFrom(c)
	groupID := uint(parsePositive(c.Param("id"), 0))
	var member model.ChatGroupMember
	if s.DB.Where("group_id = ? AND user_id = ?", groupID, user.ID).First(&member).Error != nil {
		Error(c, 403, "你不在这个群聊中")
		return
	}
	var in struct {
		Content string `json:"content"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	row := model.GroupMessage{GroupID: groupID, SenderID: user.ID, Content: strings.TrimSpace(in.Content), CreatedAt: time.Now().UTC()}
	s.DB.Create(&row)
	c.JSON(200, s.groupMessageResponse(&row))
}
func valueOrUint(value *uint) uint {
	if value == nil {
		return 0
	}
	return *value
}
func uniqueIDs(ids []uint) []uint {
	seen := map[uint]bool{}
	out := []uint{}
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			out = append(out, id)
		}
	}
	return out
}

var _ = http.StatusOK
var _ = gorm.ErrRecordNotFound
