package httpapi

import (
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/cyrusxyz/touqi/backend-go/internal/config"
	"github.com/cyrusxyz/touqi/backend-go/internal/model"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Server struct {
	DB  *gorm.DB
	Cfg config.Config
}

func New(dbConn *gorm.DB, cfg config.Config) *Server { return &Server{DB: dbConn, Cfg: cfg} }

func (s *Server) Router() *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), s.cors(), s.ipBan())
	r.GET("/api/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok", "name": "柒月半 API"}) })
	api := r.Group("/api")
	api.POST("/auth/register", s.register)
	api.POST("/auth/login", s.login)
	api.GET("/auth/profile", s.requireAuth(), s.profile)
	api.PUT("/auth/change-password", s.requireAuth(), s.changePassword)
	api.POST("/auth/email/send-code", s.requireAuth(), s.sendEmailCode)
	api.POST("/auth/email/confirm", s.requireAuth(), s.confirmEmail)
	api.POST("/auth/forgot-password", s.forgotPassword)
	api.POST("/auth/reset-password", s.resetPassword)
	api.GET("/auth/search", s.requireAuth(), s.searchUsers)
	api.POST("/auth/admin/users/:id/ban", s.requireAuth(), s.banUser)
	api.POST("/auth/admin/users/ban-by-username", s.requireAuth(), s.banUserByUsername)
	api.POST("/auth/admin/users/:id/unban", s.requireAuth(), s.unbanUser)
	api.GET("/auth/admin/ip-bans", s.requireAuth(), s.listIPBans)
	api.POST("/auth/admin/ip-bans", s.requireAuth(), s.createIPBan)
	api.DELETE("/auth/admin/ip-bans/:id", s.requireAuth(), s.deleteIPBan)
	api.GET("/categories", s.categories)
	api.GET("/posts", s.posts)
	api.GET("/posts/:id", s.post)
	api.POST("/posts", s.requireAuth(), s.createPost)
	api.PUT("/posts/:id", s.requireAuth(), s.updatePost)
	api.DELETE("/posts/:id", s.requireAuth(), s.deletePost)
	api.GET("/posts/:id/replies", s.replies)
	api.POST("/posts/:id/replies", s.requireAuth(), s.createReply)
	api.POST("/posts/:id/like", s.requireAuth(), s.togglePostLike)
	api.GET("/posts/:id/like", s.requireAuth(), s.checkPostLike)
	api.POST("/posts/replies/:id/like", s.requireAuth(), s.toggleReplyLike)
	api.DELETE("/posts/replies/:id", s.requireAuth(), s.deleteReply)
	api.GET("/posts/:id/replies/liked", s.requireAuth(), s.likedReplies)
	api.POST("/posts/:id/grave-requests", s.requireAuth(), s.graveRequest)
	api.GET("/grave-requests", s.requireAuth(), s.listGrave)
	api.POST("/grave-requests/:id/:action", s.requireAuth(), s.reviewGraveEndpoint)
	api.POST("/posts/:id/grave", s.requireAuth(), s.markGrave)
	api.GET("/notifications", s.requireAuth(), s.notifications)
	api.GET("/notifications/unread/count", s.requireAuth(), s.unreadNotifications)
	api.POST("/notifications/:id/read", s.requireAuth(), s.readNotification)
	api.POST("/notifications/read-all", s.requireAuth(), s.readAllNotifications)
	api.DELETE("/notifications/clear-read", s.requireAuth(), func(c *gin.Context) { c.Set("kind", "read"); s.clearNotifications(c) })
	api.DELETE("/notifications/clear-all", s.requireAuth(), func(c *gin.Context) { c.Set("kind", "all"); s.clearNotifications(c) })
	api.GET("/messages/friends", s.requireAuth(), s.friends)
	api.GET("/messages/friend-requests", s.requireAuth(), s.friendRequests)
	api.POST("/messages/friend-requests", s.requireAuth(), s.sendFriendRequest)
	api.POST("/messages/friend-requests/:id/:action", s.requireAuth(), s.respondFriend)
	api.DELETE("/messages/friends/:id", s.requireAuth(), s.removeFriend)
	api.POST("/messages", s.requireAuth(), s.messages)
	api.GET("/messages/unread/count", s.requireAuth(), s.unreadMessages)
	api.GET("/messages/conversations", s.requireAuth(), s.conversations)
	api.GET("/messages/group-invites", s.requireAuth(), s.groupInvites)
	api.POST("/messages/group-invites/:id/:action", s.requireAuth(), s.respondGroupInvite)
	api.GET("/messages/groups", s.requireAuth(), s.listGroups)
	api.POST("/messages/groups", s.requireAuth(), s.createGroup)
	api.GET("/messages/groups/:id", s.requireAuth(), s.groupDetail)
	api.POST("/messages/groups/:id/join", s.requireAuth(), s.joinGroup)
	api.POST("/messages/groups/:id/leave", s.requireAuth(), s.leaveGroup)
	api.POST("/messages/groups/:id/members", s.requireAuth(), s.inviteGroupMember)
	api.GET("/messages/groups/:id/messages", s.requireAuth(), s.groupMessages)
	api.POST("/messages/groups/:id/messages", s.requireAuth(), s.sendGroupMessage)
	api.GET("/messages/:id", s.requireAuth(), s.conversationMessages)
	api.POST("/messages/:id/read", s.requireAuth(), s.readMessages)
	api.DELETE("/messages/:id", s.requireAuth(), s.deleteConversation)
	api.GET("/announcement", s.getAnnouncement)
	api.PUT("/announcement", s.requireAuth(), s.updateAnnouncement)
	api.GET("/app-version/latest", s.latestVersion)
	api.POST("/app-version", s.requireAuth(), s.createVersion)
	api.POST("/app-version/", s.requireAuth(), s.createVersion)
	api.PUT("/app-version/:id", s.requireAuth(), s.updateVersion)
	api.POST("/upload/image", s.requireAuth(), s.uploadImage)
	api.Static("/uploads", s.Cfg.UploadDir)
	return r
}

func (s *Server) cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		for _, allowed := range s.Cfg.CORSOrigins {
			if allowed == "*" || allowed == origin {
				c.Header("Access-Control-Allow-Origin", origin)
				c.Header("Access-Control-Allow-Credentials", "true")
				c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
				c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
				if c.Request.Method == "OPTIONS" {
					c.AbortWithStatus(http.StatusNoContent)
					return
				}
				break
			}
		}
		c.Next()
	}
}
func (s *Server) ipBan() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		var ban model.IpBan
		if err := s.DB.Where("ip_address = ?", ip).First(&ban).Error; err == nil {
			Error(c, http.StatusForbidden, valueOrPtr(ban.Reason, "IP 已被封禁"))
			c.Abort()
			return
		}
		c.Next()
	}
}
func (s *Server) requireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := strings.TrimSpace(strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer "))
		claims := jwt.MapClaims{}
		parsed, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (any, error) {
			if t.Method.Alg() != "HS256" {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(s.Cfg.SecretKey), nil
		})
		if err != nil || !parsed.Valid {
			Error(c, http.StatusUnauthorized, "无效的认证令牌")
			c.Abort()
			return
		}
		raw, ok := claims["sub"].(string)
		if !ok {
			Error(c, http.StatusUnauthorized, "无效的认证令牌")
			c.Abort()
			return
		}
		var user model.User
		if err := s.DB.First(&user, raw).Error; err != nil {
			Error(c, http.StatusUnauthorized, "用户不存在")
			c.Abort()
			return
		}
		if user.IsBanned {
			Error(c, http.StatusForbidden, valueOrPtr(user.BannedReason, "账号已被封禁"))
			c.Abort()
			return
		}
		now := time.Now().UTC()
		if user.LastSeenAt == nil || now.Sub(*user.LastSeenAt) >= 30*time.Second {
			s.DB.Model(&user).Update("last_seen_at", now)
		}
		c.Set("user", &user)
		c.Next()
	}
}
func userFrom(c *gin.Context) *model.User {
	value, _ := c.Get("user")
	user, _ := value.(*model.User)
	return user
}
func (s *Server) token(userID uint) (string, error) {
	claims := jwt.MapClaims{"sub": fmtUint(userID), "exp": time.Now().Add(time.Duration(s.Cfg.AccessTokenExpireMinutes) * time.Minute).Unix()}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(s.Cfg.SecretKey))
}
func (s *Server) register(c *gin.Context) {
	var in struct {
		Username string  `json:"username"`
		Password string  `json:"password"`
		Nickname string  `json:"nickname"`
		Avatar   string  `json:"avatar"`
		Email    *string `json:"email"`
	}
	if c.ShouldBindJSON(&in) != nil || strings.TrimSpace(in.Username) == "" {
		Error(c, 400, "请求参数无效")
		return
	}
	var exists model.User
	if s.DB.Where("username = ?", in.Username).First(&exists).Error == nil {
		Error(c, 400, "用户名已存在")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		Error(c, 500, "注册失败")
		return
	}
	nick := in.Nickname
	if nick == "" {
		nick = in.Username
	}
	avatar := in.Avatar
	if avatar == "" {
		avatar = "eye"
	}
	user := model.User{Username: in.Username, Nickname: nick, PasswordHash: string(hash), Avatar: avatar, Email: in.Email}
	if err := s.DB.Create(&user).Error; err != nil {
		Error(c, 400, "注册失败")
		return
	}
	token, _ := s.token(user.ID)
	c.JSON(200, gin.H{"token": token, "user": s.userResponse(&user)})
}
func (s *Server) login(c *gin.Context) {
	var in struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	var user model.User
	if s.DB.Where("username = ?", in.Username).First(&user).Error != nil || bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(in.Password)) != nil {
		Error(c, 401, "用户名或密码错误")
		return
	}
	if user.IsBanned {
		Error(c, 403, "该账号已被封禁，请联系管理员。")
		return
	}
	token, _ := s.token(user.ID)
	c.JSON(200, gin.H{"token": token, "user": s.userResponse(&user)})
}
func (s *Server) profile(c *gin.Context) { c.JSON(200, s.userResponse(userFrom(c))) }
func (s *Server) userResponse(user *model.User) gin.H {
	email := any(nil)
	if user.EmailVerified && user.Email != nil {
		email = *user.Email
	}
	return gin.H{"uid": user.ID, "username": user.Username, "nickname": user.Nickname, "avatar": valueOr(user.Avatar, ""), "is_admin": user.IsAdmin, "is_banned": user.IsBanned, "banned_reason": user.BannedReason, "email": email}
}
func (s *Server) changePassword(c *gin.Context) {
	user := userFrom(c)
	var in struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if c.ShouldBindJSON(&in) != nil || bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(in.OldPassword)) != nil {
		Error(c, 400, "原密码错误")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		Error(c, 500, "密码修改失败")
		return
	}
	s.DB.Model(user).Update("password_hash", string(hash))
	Detail(c, "密码修改成功")
}
func (s *Server) categories(c *gin.Context) {
	var rows []model.Category
	s.DB.Order("id asc").Find(&rows)
	c.JSON(200, rows)
}
func (s *Server) posts(c *gin.Context) {
	var rows []model.Post
	q := s.DB
	if v := c.Query("category"); v != "" {
		q = q.Where("category = ?", v)
	}
	if v := c.Query("author_id"); v != "" {
		q = q.Where("author_id = ?", v)
	}
	if v := c.Query("search"); v != "" {
		like := "%" + v + "%"
		q = q.Where("title ILIKE ? OR content ILIKE ? OR author_name ILIKE ?", like, like, like)
	}
	total := int64(0)
	q.Model(&model.Post{}).Count(&total)
	page := parsePositive(c.Query("page"), 1)
	size := parseBounded(c.Query("page_size"), 10, 1, 50)
	order := "created_at DESC"
	if c.Query("sort") == "likes" {
		order = "like_count DESC, created_at DESC"
	}
	q.Order(order).Offset((page - 1) * size).Limit(size).Find(&rows)
	items := make([]gin.H, 0, len(rows))
	for i := range rows {
		items = append(items, s.postResponse(&rows[i]))
	}
	pages := int((total + int64(size) - 1) / int64(size))
	if pages < 1 {
		pages = 1
	}
	c.JSON(200, gin.H{"items": items, "total": total, "page": page, "page_size": size, "total_pages": pages})
}
func (s *Server) post(c *gin.Context) {
	var row model.Post
	if s.DB.First(&row, c.Param("id")).Error != nil {
		Error(c, 404, "帖子不存在")
		return
	}
	c.JSON(200, s.postResponse(&row))
}
func (s *Server) postResponse(row *model.Post) gin.H {
	authorAvatar := ""
	if author := s.loadUser(row.AuthorID); author != nil {
		authorAvatar = author.Avatar
	}
	return gin.H{"id": row.ID, "title": row.Title, "content": row.Content, "image_url": row.ImageURL, "category": row.Category, "author": row.AuthorName, "author_id": row.AuthorID, "author_avatar": authorAvatar, "reply_count": row.ReplyCount, "like_count": row.LikeCount, "is_liked": false, "is_grave": row.IsGrave, "created_at": formatTimeValue(row.CreatedAt)}
}
func (s *Server) replies(c *gin.Context) {
	var rows []model.Reply
	if s.DB.Where("post_id = ?", c.Param("id")).Order("created_at asc").Find(&rows).Error != nil {
		Error(c, 404, "帖子不存在")
		return
	}
	out := make([]gin.H, 0, len(rows))
	for _, row := range rows {
		authorAvatar := ""
		if author := s.loadUser(row.AuthorID); author != nil {
			authorAvatar = author.Avatar
		}
		out = append(out, gin.H{"id": row.ID, "content": row.Content, "image_url": row.ImageURL, "author": row.AuthorName, "author_id": row.AuthorID, "author_avatar": authorAvatar, "like_count": row.LikeCount, "is_liked": false, "reply_to_id": row.ReplyToID, "reply_to_user_id": row.ReplyToUserID, "reply_to_username": row.ReplyToUsername, "created_at": formatTimeValue(row.CreatedAt)})
	}
	c.JSON(200, out)
}
func (s *Server) announcement(c *gin.Context) {}
func (s *Server) getAnnouncement(c *gin.Context) {
	var row model.Announcement
	if s.DB.Order("id asc").First(&row).Error != nil {
		row = model.Announcement{Content: ""}
		s.DB.Create(&row)
	}
	c.JSON(200, gin.H{"content": row.Content})
}
func (s *Server) latestVersion(c *gin.Context) {
	var row model.AppVersion
	if s.DB.Order("version_code desc").First(&row).Error != nil {
		Error(c, 404, "No versions found")
		return
	}
	c.JSON(200, row)
}
func (s *Server) uploadImage(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		Error(c, 400, "未上传文件")
		return
	}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowed[ext] || !strings.HasPrefix(file.Header.Get("Content-Type"), "image/") {
		Error(c, 400, "不支持的文件格式")
		return
	}
	name := uuid.New().String()
	name = strings.ReplaceAll(name, "-", "") + ext
	if err := os.MkdirAll(s.Cfg.UploadDir, 0755); err != nil {
		Error(c, 500, "图片保存失败")
		return
	}
	if err := c.SaveUploadedFile(file, filepath.Join(s.Cfg.UploadDir, name)); err != nil {
		Error(c, 500, "图片保存失败")
		return
	}
	c.JSON(200, gin.H{"url": "/api/uploads/" + name})
}

func valueOr(value, fallback string) string {
	if value != "" {
		return value
	}
	return fallback
}
func valueOrPtr(value *string, fallback string) string {
	if value != nil && *value != "" {
		return *value
	}
	return fallback
}
func fmtUint(v uint) string { return strconv.FormatUint(uint64(v), 10) }
func parsePositive(value string, fallback int) int {
	n, err := strconv.Atoi(value)
	if err != nil || n < 1 {
		return fallback
	}
	return n
}
func parseBounded(value string, fallback, min, max int) int {
	n := parsePositive(value, fallback)
	if n < min {
		return min
	}
	if n > max {
		return max
	}
	return n
}
