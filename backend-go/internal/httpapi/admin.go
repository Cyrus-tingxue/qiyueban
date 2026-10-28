package httpapi

import (
	"net"
	"strings"
	"time"

	"github.com/cyrusxyz/touqi/backend-go/internal/model"
	"github.com/gin-gonic/gin"
)

// banUser 管理员封禁普通用户；不能封禁自己或其他管理员。
func (s *Server) banUser(c *gin.Context) {
	if !s.requireAdmin(c) {
		return
	}
	var in struct {
		Reason *string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&in)
	var user model.User
	if s.DB.First(&user, c.Param("id")).Error != nil {
		Error(c, 404, "用户不存在")
		return
	}
	admin := userFrom(c)
	if user.ID == admin.ID {
		Error(c, 400, "不能封禁自己")
		return
	}
	if user.IsAdmin {
		Error(c, 400, "不能封禁管理员")
		return
	}
	reason := in.Reason
	if reason == nil {
		reason = strPtr("账号已被封禁，请联系管理员。")
	}
	s.DB.Model(&user).Updates(map[string]any{"is_banned": true, "banned_reason": reason})
	s.DB.First(&user, user.ID)
	c.JSON(200, s.userResponse(&user))
}
func (s *Server) banUserByUsername(c *gin.Context) {
	if !s.requireAdmin(c) {
		return
	}
	var in struct {
		Username string  `json:"username"`
		Reason   *string `json:"reason"`
	}
	if c.ShouldBindJSON(&in) != nil || strings.TrimSpace(in.Username) == "" {
		Error(c, 400, "用户名不能为空")
		return
	}
	var user model.User
	if s.DB.Where("username = ?", strings.TrimSpace(in.Username)).First(&user).Error != nil {
		Error(c, 404, "用户不存在")
		return
	}
	admin := userFrom(c)
	if user.ID == admin.ID || user.IsAdmin {
		Error(c, 400, "不能封禁管理员")
		return
	}
	reason := in.Reason
	if reason == nil {
		reason = strPtr("账号已被封禁，请联系管理员。")
	}
	s.DB.Model(&user).Updates(map[string]any{"is_banned": true, "banned_reason": reason})
	s.DB.First(&user, user.ID)
	c.JSON(200, s.userResponse(&user))
}
func (s *Server) unbanUser(c *gin.Context) {
	if !s.requireAdmin(c) {
		return
	}
	var user model.User
	if s.DB.First(&user, c.Param("id")).Error != nil {
		Error(c, 404, "用户不存在")
		return
	}
	s.DB.Model(&user).Updates(map[string]any{"is_banned": false, "banned_reason": nil})
	s.DB.First(&user, user.ID)
	c.JSON(200, s.userResponse(&user))
}
func (s *Server) listIPBans(c *gin.Context) {
	if !s.requireAdmin(c) {
		return
	}
	var rows []model.IpBan
	s.DB.Order("created_at desc").Find(&rows)
	out := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		out = append(out, gin.H{"id": row.ID, "ip_address": row.IPAddress, "reason": row.Reason, "created_at": formatTimeValue(row.CreatedAt)})
	}
	c.JSON(200, out)
}

// createIPBan 校验 IP 格式后创建或更新黑名单记录；重复 IP 按幂等更新处理。
func (s *Server) createIPBan(c *gin.Context) {
	if !s.requireAdmin(c) {
		return
	}
	var in struct {
		IPAddress string  `json:"ip_address"`
		Reason    *string `json:"reason"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	ip := strings.TrimSpace(in.IPAddress)
	if net.ParseIP(ip) == nil {
		Error(c, 400, "IP 格式不正确")
		return
	}
	var row model.IpBan
	if s.DB.Where("ip_address = ?", ip).First(&row).Error != nil {
		row = model.IpBan{IPAddress: ip, CreatedByID: uintPtr(userFrom(c).ID), CreatedAt: time.Now().UTC()}
		s.DB.Create(&row)
	}
	s.DB.Model(&row).Update("reason", in.Reason)
	s.DB.First(&row, row.ID)
	c.JSON(200, gin.H{"id": row.ID, "ip_address": row.IPAddress, "reason": row.Reason, "created_at": formatTimeValue(row.CreatedAt)})
}
func (s *Server) deleteIPBan(c *gin.Context) {
	if !s.requireAdmin(c) {
		return
	}
	var row model.IpBan
	if s.DB.First(&row, c.Param("id")).Error != nil {
		Error(c, 404, "IP 封禁不存在")
		return
	}
	s.DB.Delete(&row)
	Detail(c, "解除 IP 封禁成功")
}

// updateAnnouncement 更新公告单例；如果数据库还没有记录则先创建第一条。
func (s *Server) updateAnnouncement(c *gin.Context) {
	if !s.requireAdmin(c) {
		return
	}
	var in struct {
		Content string `json:"content"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	var row model.Announcement
	if s.DB.Order("id asc").First(&row).Error != nil {
		row = model.Announcement{Content: in.Content, UpdatedAt: time.Now().UTC()}
		s.DB.Create(&row)
	} else {
		s.DB.Model(&row).Updates(map[string]any{"content": in.Content, "updated_at": time.Now().UTC()})
	}
	c.JSON(200, gin.H{"content": in.Content})
}

// createVersion 创建移动端版本记录；/api/app-version 与尾斜杠别名共用此 handler。
func (s *Server) createVersion(c *gin.Context) {
	if !s.requireAdmin(c) {
		return
	}
	var in struct {
		VersionCode int    `json:"version_code"`
		VersionName string `json:"version_name"`
		DownloadURL string `json:"download_url"`
		UpdateLog   string `json:"update_log"`
		ForceUpdate bool   `json:"force_update"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	row := model.AppVersion{VersionCode: in.VersionCode, VersionName: in.VersionName, DownloadURL: in.DownloadURL, UpdateLog: in.UpdateLog, ForceUpdate: in.ForceUpdate, CreatedAt: time.Now().UTC()}
	s.DB.Create(&row)
	c.JSON(200, row)
}
func (s *Server) updateVersion(c *gin.Context) {
	if !s.requireAdmin(c) {
		return
	}
	var row model.AppVersion
	if s.DB.First(&row, c.Param("id")).Error != nil {
		Error(c, 404, "Version not found")
		return
	}
	var in map[string]any
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	s.DB.Model(&row).Updates(in)
	s.DB.First(&row, row.ID)
	c.JSON(200, row)
}
