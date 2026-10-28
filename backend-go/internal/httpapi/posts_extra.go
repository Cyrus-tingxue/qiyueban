package httpapi

import (
	"regexp"
	"strings"
	"time"

	"github.com/cyrusxyz/touqi/backend-go/internal/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// createPost 创建帖子，并把作者昵称保存为历史快照；实际用户头像在响应时动态读取。
func (s *Server) createPost(c *gin.Context) {
	user := userFrom(c)
	var in struct {
		Title    string  `json:"title"`
		Content  string  `json:"content"`
		Category string  `json:"category"`
		ImageURL *string `json:"image_url"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	var cat model.Category
	if s.DB.Where("name = ?", in.Category).First(&cat).Error != nil {
		in.Category = "讨论"
	}
	row := model.Post{Title: in.Title, Content: in.Content, Category: in.Category, AuthorID: user.ID, AuthorName: user.Nickname, ImageURL: in.ImageURL}
	if err := s.DB.Create(&row).Error; err != nil {
		Error(c, 400, "创建帖子失败")
		return
	}
	c.JSON(200, s.postResponse(&row))
}
func (s *Server) updatePost(c *gin.Context) {
	user := userFrom(c)
	var row model.Post
	if s.DB.First(&row, c.Param("id")).Error != nil {
		Error(c, 404, "帖子不存在")
		return
	}
	if row.AuthorID != user.ID {
		Error(c, 403, "无权编辑此帖子")
		return
	}
	var in struct {
		Title    *string `json:"title"`
		Content  *string `json:"content"`
		Category *string `json:"category"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	updates := map[string]any{}
	if in.Title != nil {
		updates["title"] = *in.Title
	}
	if in.Content != nil {
		updates["content"] = *in.Content
	}
	if in.Category != nil {
		var cat model.Category
		if s.DB.Where("name = ?", *in.Category).First(&cat).Error == nil {
			updates["category"] = *in.Category
		}
	}
	if len(updates) > 0 {
		s.DB.Model(&row).Updates(updates)
		s.DB.First(&row, row.ID)
	}
	c.JSON(200, s.postResponse(&row))
}

// deletePost 在一个事务中删除帖子、回复及其点赞，避免留下孤儿记录。
func (s *Server) deletePost(c *gin.Context) {
	user := userFrom(c)
	var row model.Post
	if s.DB.First(&row, c.Param("id")).Error != nil {
		Error(c, 404, "帖子不存在")
		return
	}
	if row.AuthorID != user.ID && !user.IsAdmin {
		Error(c, 403, "无权删除此帖子")
		return
	}
	tx := s.DB.Begin()
	var replies []model.Reply
	tx.Where("post_id = ?", row.ID).Find(&replies)
	ids := make([]uint, 0, len(replies))
	for _, reply := range replies {
		ids = append(ids, reply.ID)
	}
	if len(ids) > 0 {
		tx.Where("reply_id IN ?", ids).Delete(&model.ReplyLike{})
	}
	tx.Where("post_id = ?", row.ID).Delete(&model.Like{})
	tx.Where("post_id = ?", row.ID).Delete(&model.Reply{})
	if err := tx.Delete(&row).Error; err != nil {
		tx.Rollback()
		Error(c, 500, "删除失败")
		return
	}
	tx.Commit()
	Detail(c, "删除成功")
}

// togglePostLike 切换帖子点赞，并用数据库表达式更新计数，避免计数低于零。
func (s *Server) togglePostLike(c *gin.Context) {
	user := userFrom(c)
	var row model.Post
	if s.DB.First(&row, c.Param("id")).Error != nil {
		Error(c, 404, "帖子不存在")
		return
	}
	var like model.Like
	liked := s.DB.Where("post_id = ? AND user_id = ?", row.ID, user.ID).First(&like).Error == nil
	if liked {
		s.DB.Delete(&like)
		s.DB.Model(&row).UpdateColumn("like_count", gorm.Expr("GREATEST(like_count - 1, 0)"))
		liked = false
	} else {
		if err := s.DB.Create(&model.Like{PostID: row.ID, UserID: user.ID}).Error; err != nil {
			Error(c, 409, "点赞状态冲突")
			return
		}
		s.DB.Model(&row).UpdateColumn("like_count", gorm.Expr("like_count + 1"))
		liked = true
	}
	s.DB.First(&row, row.ID)
	c.JSON(200, gin.H{"like_count": row.LikeCount, "is_liked": liked})
}
func (s *Server) checkPostLike(c *gin.Context) {
	user := userFrom(c)
	var row model.Post
	if s.DB.First(&row, c.Param("id")).Error != nil {
		Error(c, 404, "帖子不存在")
		return
	}
	var like model.Like
	liked := s.DB.Where("post_id = ? AND user_id = ?", row.ID, user.ID).First(&like).Error == nil
	c.JSON(200, gin.H{"like_count": row.LikeCount, "is_liked": liked})
}

// createReply 创建回复、递增帖子回复数，并为 @提及和回复目标创建通知。
func (s *Server) createReply(c *gin.Context) {
	user := userFrom(c)
	var post model.Post
	if s.DB.First(&post, c.Param("id")).Error != nil {
		Error(c, 404, "帖子不存在")
		return
	}
	if post.IsGrave {
		Error(c, 403, "该帖子已成坟贴，不可回复")
		return
	}
	var in struct {
		Content         string  `json:"content"`
		ImageURL        *string `json:"image_url"`
		ReplyToID       *uint   `json:"reply_to_id"`
		ReplyToUserID   *uint   `json:"reply_to_user_id"`
		ReplyToUsername *string `json:"reply_to_username"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	reply := model.Reply{Content: in.Content, ImageURL: in.ImageURL, PostID: post.ID, AuthorID: user.ID, AuthorName: user.Nickname, ReplyToID: in.ReplyToID, ReplyToUserID: in.ReplyToUserID, ReplyToUsername: in.ReplyToUsername}
	tx := s.DB.Begin()
	if err := tx.Create(&reply).Error; err != nil {
		tx.Rollback()
		Error(c, 400, "创建回帖失败")
		return
	}
	tx.Model(&post).UpdateColumn("reply_count", gorm.Expr("reply_count + 1"))
	tx.Commit()
	s.createReplyNotifications(&reply, &post, user)
	if strings.Contains(reply.Content, "@小柒") {
		go s.generateXiaoqiReply(reply, post, user)
	}
	c.JSON(200, gin.H{"id": reply.ID, "content": reply.Content, "image_url": reply.ImageURL, "author": reply.AuthorName, "author_id": reply.AuthorID, "author_avatar": user.Avatar, "like_count": 0, "is_liked": false, "reply_to_id": reply.ReplyToID, "reply_to_user_id": reply.ReplyToUserID, "reply_to_username": reply.ReplyToUsername, "created_at": formatTimeValue(reply.CreatedAt)})
}

// createReplyNotifications 合并 @username、回复目标和帖子作者，避免同一回复重复通知同一人。
func (s *Server) createReplyNotifications(reply *model.Reply, post *model.Post, user *model.User) {
	pattern := regexp.MustCompile(`@([\w\x{4e00}-\x{9fa5}]+)`)
	matches := pattern.FindAllStringSubmatch(reply.Content, -1)
	receivers := map[uint]string{}
	for _, match := range matches {
		var target model.User
		if s.DB.Where("username = ?", match[1]).First(&target).Error == nil && target.ID != user.ID {
			receivers[target.ID] = "mention"
		}
	}
	if reply.ReplyToUserID != nil && *reply.ReplyToUserID != user.ID {
		if _, ok := receivers[*reply.ReplyToUserID]; ok {
			receivers[*reply.ReplyToUserID] = "reply_mention"
		} else {
			receivers[*reply.ReplyToUserID] = "reply"
		}
	} else if reply.ReplyToUserID == nil && post.AuthorID != user.ID {
		receivers[post.AuthorID] = "reply"
	}
	for id, kind := range receivers {
		sid := user.ID
		name := user.Nickname
		pid := post.ID
		tid := reply.ID
		s.DB.Create(&model.Notification{ReceiverID: id, SenderID: &sid, SenderName: &name, Type: kind, TargetID: &tid, PostID: &pid})
	}
}
func (s *Server) toggleReplyLike(c *gin.Context) {
	user := userFrom(c)
	var row model.Reply
	if s.DB.First(&row, c.Param("id")).Error != nil {
		Error(c, 404, "回帖不存在")
		return
	}
	var like model.ReplyLike
	liked := s.DB.Where("reply_id = ? AND user_id = ?", row.ID, user.ID).First(&like).Error == nil
	if liked {
		s.DB.Delete(&like)
		s.DB.Model(&row).UpdateColumn("like_count", gorm.Expr("GREATEST(like_count - 1, 0)"))
		liked = false
	} else {
		if err := s.DB.Create(&model.ReplyLike{ReplyID: row.ID, UserID: user.ID}).Error; err != nil {
			Error(c, 409, "点赞状态冲突")
			return
		}
		s.DB.Model(&row).UpdateColumn("like_count", gorm.Expr("like_count + 1"))
		liked = true
	}
	s.DB.First(&row, row.ID)
	c.JSON(200, gin.H{"like_count": row.LikeCount, "is_liked": liked})
}
func (s *Server) deleteReply(c *gin.Context) {
	user := userFrom(c)
	var row model.Reply
	if s.DB.First(&row, c.Param("id")).Error != nil {
		Error(c, 404, "回帖不存在")
		return
	}
	if row.AuthorID != user.ID && !user.IsAdmin {
		Error(c, 403, "无权删除此回帖")
		return
	}
	tx := s.DB.Begin()
	tx.Where("reply_id = ?", row.ID).Delete(&model.ReplyLike{})
	tx.Delete(&row)
	tx.Model(&model.Post{}).Where("id = ? AND reply_count > 0", row.PostID).UpdateColumn("reply_count", gorm.Expr("reply_count - 1"))
	tx.Commit()
	Detail(c, "删除成功")
}
func (s *Server) likedReplies(c *gin.Context) {
	user := userFrom(c)
	var ids []uint
	s.DB.Table("reply_likes").Joins("JOIN replies ON replies.id = reply_likes.reply_id").Where("replies.post_id = ? AND reply_likes.user_id = ?", c.Param("id"), user.ID).Pluck("reply_likes.reply_id", &ids)
	c.JSON(200, ids)
}

// graveRequest 创建坟贴申请；管理员申请会直接走审核逻辑，普通用户只能申请自己的帖子。
func (s *Server) graveRequest(c *gin.Context) {
	user := userFrom(c)
	var post model.Post
	if s.DB.First(&post, c.Param("id")).Error != nil {
		Error(c, 404, "帖子不存在")
		return
	}
	if post.IsGrave {
		Error(c, 400, "该帖子已经是坟贴")
		return
	}
	if !user.IsAdmin && post.AuthorID != user.ID {
		Error(c, 403, "只能申请自己的帖子为坟贴")
		return
	}
	var in struct {
		Reason *string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&in)
	var row model.GraveRequest
	if s.DB.Where("post_id = ? AND requester_id = ? AND status = ?", post.ID, user.ID, "pending").First(&row).Error != nil {
		row = model.GraveRequest{PostID: post.ID, RequesterID: user.ID, RequesterName: user.Nickname, Reason: in.Reason, Status: "pending"}
		s.DB.Create(&row)
	}
	if user.IsAdmin {
		s.reviewGrave(&row, user.ID, true)
	}
	c.JSON(200, s.graveResponse(&row, &post))
}
func (s *Server) graveResponse(row *model.GraveRequest, post *model.Post) gin.H {
	return gin.H{"id": row.ID, "post_id": row.PostID, "post_title": post.Title, "requester_id": row.RequesterID, "requester_name": row.RequesterName, "reason": row.Reason, "status": row.Status, "created_at": formatTimeValue(row.CreatedAt)}
}
func (s *Server) listGrave(c *gin.Context) {
	if !s.requireAdmin(c) {
		return
	}
	var rows []model.GraveRequest
	q := s.DB
	if status := c.DefaultQuery("status", "pending"); status != "all" {
		q = q.Where("status = ?", status)
	}
	q.Order("created_at desc").Find(&rows)
	out := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		var post model.Post
		s.DB.First(&post, row.PostID)
		out = append(out, s.graveResponse(&row, &post))
	}
	c.JSON(200, out)
}
func (s *Server) reviewGraveEndpoint(c *gin.Context) {
	if !s.requireAdmin(c) {
		return
	}
	var row model.GraveRequest
	if s.DB.First(&row, c.Param("id")).Error != nil {
		Error(c, 404, "申请不存在")
		return
	}
	s.reviewGrave(&row, userFrom(c).ID, c.Param("action") == "approve")
	var post model.Post
	s.DB.First(&post, row.PostID)
	c.JSON(200, s.graveResponse(&row, &post))
}

// reviewGrave 更新申请状态；批准时会插入系统回复并把帖子标记为不可回复。
func (s *Server) reviewGrave(row *model.GraveRequest, reviewer uint, approve bool) {
	if row.Status != "pending" {
		return
	}
	now := time.Now().UTC()
	row.Status = map[bool]string{true: "approved", false: "rejected"}[approve]
	row.ReviewedByID = &reviewer
	row.ReviewedAt = &now
	s.DB.Save(row)
	if approve {
		var post model.Post
		if s.DB.First(&post, row.PostID).Error == nil && !post.IsGrave {
			var admin model.User
			s.DB.First(&admin, reviewer)
			reply := model.Reply{Content: "由于未知原因，此帖子不可回复。", PostID: post.ID, AuthorID: reviewer, AuthorName: admin.Nickname}
			s.DB.Create(&reply)
			s.DB.Model(&post).Updates(map[string]any{"is_grave": true, "grave_at": now, "grave_by_id": reviewer, "reply_count": gorm.Expr("reply_count + 1")})
		}
	}
}
func (s *Server) markGrave(c *gin.Context) {
	if !s.requireAdmin(c) {
		return
	}
	var post model.Post
	if s.DB.First(&post, c.Param("id")).Error != nil {
		Error(c, 404, "帖子不存在")
		return
	}
	now := time.Now().UTC()
	var admin model.User
	s.DB.First(&admin, userFrom(c).ID)
	if !post.IsGrave {
		reply := model.Reply{Content: "由于未知原因，此帖子不可回复。", PostID: post.ID, AuthorID: admin.ID, AuthorName: admin.Nickname}
		s.DB.Create(&reply)
		post.ReplyCount++
	}
	post.IsGrave = true
	post.GraveAt = &now
	post.GraveByID = uintPtr(admin.ID)
	s.DB.Save(&post)
	c.JSON(200, s.postResponse(&post))
}
