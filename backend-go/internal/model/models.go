package model

import "time"

// User 对应 users 表。PasswordHash 只用于认证，不能直接序列化给客户端。
type User struct {
	ID                         uint       `gorm:"column:id;primaryKey" json:"uid"`
	Username                   string     `gorm:"column:username;uniqueIndex;size:255;not null" json:"username"`
	Nickname                   string     `gorm:"column:nickname;size:255;not null" json:"nickname"`
	PasswordHash               string     `gorm:"column:password_hash;size:128;not null" json:"-"`
	Email                      *string    `gorm:"column:email;uniqueIndex;size:255" json:"-"`
	EmailVerified              bool       `gorm:"column:email_verified" json:"-"`
	PendingEmail               *string    `gorm:"column:pending_email;size:255" json:"-"`
	EmailVerificationCodeHash  *string    `gorm:"column:email_verification_code_hash;size:128" json:"-"`
	EmailVerificationExpiresAt *time.Time `gorm:"column:email_verification_expires_at" json:"-"`
	PasswordResetTokenHash     *string    `gorm:"column:password_reset_token_hash;size:128" json:"-"`
	PasswordResetExpiresAt     *time.Time `gorm:"column:password_reset_expires_at" json:"-"`
	Avatar                     string     `gorm:"column:avatar;size:255" json:"avatar"`
	IsAdmin                    bool       `gorm:"column:is_admin" json:"is_admin"`
	IsBanned                   bool       `gorm:"column:is_banned" json:"is_banned"`
	BannedReason               *string    `gorm:"column:banned_reason;size:500" json:"banned_reason"`
	CreatedAt                  time.Time  `gorm:"column:created_at" json:"-"`
	LastSeenAt                 *time.Time `gorm:"column:last_seen_at" json:"-"`
}

func (User) TableName() string { return "users" }

// Announcement 对应当前论坛公告；应用约定只维护第一条记录。
type Announcement struct {
	ID        uint      `gorm:"column:id;primaryKey"`
	Content   string    `gorm:"column:content;not null"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
}

func (Announcement) TableName() string { return "announcements" }

// Category 是帖子分类表，名称同时作为帖子上的 category 快照保存。
type Category struct {
	ID   uint   `gorm:"column:id;primaryKey"`
	Name string `gorm:"column:name;uniqueIndex;size:20;not null"`
	Icon string `gorm:"column:icon;size:255"`
}

func (Category) TableName() string { return "categories" }

// Post 对应 posts 表。AuthorName 是创建时的昵称快照，AuthorID 仍是关联用户的真实 ID。
type Post struct {
	ID         uint       `gorm:"column:id;primaryKey"`
	Title      string     `gorm:"column:title;size:500;not null"`
	Content    string     `gorm:"column:content"`
	ImageURL   *string    `gorm:"column:image_url;size:500"`
	Category   string     `gorm:"column:category;size:20;not null;index"`
	AuthorID   uint       `gorm:"column:author_id;not null"`
	AuthorName string     `gorm:"column:author_name;size:255;not null"`
	ReplyCount int        `gorm:"column:reply_count"`
	LikeCount  int        `gorm:"column:like_count"`
	IsGrave    bool       `gorm:"column:is_grave;index"`
	GraveAt    *time.Time `gorm:"column:grave_at"`
	GraveByID  *uint      `gorm:"column:grave_by_id"`
	CreatedAt  time.Time  `gorm:"column:created_at"`
	UpdatedAt  time.Time  `gorm:"column:updated_at"`
}

func (Post) TableName() string { return "posts" }

// Reply 对应 replies 表。ReplyTo 字段用于客户端展示楼中楼引用关系。
type Reply struct {
	ID              uint      `gorm:"column:id;primaryKey"`
	Content         string    `gorm:"column:content;not null"`
	ImageURL        *string   `gorm:"column:image_url;size:500"`
	PostID          uint      `gorm:"column:post_id;index;not null"`
	AuthorID        uint      `gorm:"column:author_id;not null"`
	AuthorName      string    `gorm:"column:author_name;size:255;not null"`
	LikeCount       int       `gorm:"column:like_count"`
	ReplyToID       *uint     `gorm:"column:reply_to_id"`
	ReplyToUserID   *uint     `gorm:"column:reply_to_user_id"`
	ReplyToUsername *string   `gorm:"column:reply_to_username;size:255"`
	CreatedAt       time.Time `gorm:"column:created_at"`
}

func (Reply) TableName() string { return "replies" }

// Like 是帖子点赞表；user_id 与 post_id 由联合唯一约束防止重复点赞。
type Like struct {
	ID        uint      `gorm:"column:id;primaryKey"`
	UserID    uint      `gorm:"column:user_id;not null;uniqueIndex:uq_user_post_like,priority:1"`
	PostID    uint      `gorm:"column:post_id;not null;uniqueIndex:uq_user_post_like,priority:2"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (Like) TableName() string { return "likes" }

// ReplyLike 是回复点赞表，唯一约束与 Like 相同但作用于 reply_id。
type ReplyLike struct {
	ID        uint      `gorm:"column:id;primaryKey"`
	UserID    uint      `gorm:"column:user_id;not null;uniqueIndex:uq_user_reply_like,priority:1"`
	ReplyID   uint      `gorm:"column:reply_id;not null;uniqueIndex:uq_user_reply_like,priority:2"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (ReplyLike) TableName() string { return "reply_likes" }

// GraveRequest 记录将帖子标记为不可回复（坟贴）的申请和审核状态。
type GraveRequest struct {
	ID            uint       `gorm:"column:id;primaryKey"`
	PostID        uint       `gorm:"column:post_id;not null;index"`
	RequesterID   uint       `gorm:"column:requester_id;not null;index"`
	RequesterName string     `gorm:"column:requester_name;size:255;not null"`
	Reason        *string    `gorm:"column:reason"`
	Status        string     `gorm:"column:status;size:20;not null;index"`
	ReviewedByID  *uint      `gorm:"column:reviewed_by_id"`
	ReviewedAt    *time.Time `gorm:"column:reviewed_at"`
	CreatedAt     time.Time  `gorm:"column:created_at;index"`
}

func (GraveRequest) TableName() string { return "grave_requests" }

// IpBan 是管理员维护的 IP 黑名单；中间件会在每个请求进入路由前查询它。
type IpBan struct {
	ID          uint      `gorm:"column:id;primaryKey"`
	IPAddress   string    `gorm:"column:ip_address;uniqueIndex;size:64;not null"`
	Reason      *string   `gorm:"column:reason;size:500"`
	CreatedByID *uint     `gorm:"column:created_by_id"`
	CreatedAt   time.Time `gorm:"column:created_at"`
}

func (IpBan) TableName() string { return "ip_bans" }

// Notification 是站内通知。group_invite 通知在普通通知列表中按旧客户端契约排除。
type Notification struct {
	ID           uint      `gorm:"column:id;primaryKey"`
	ReceiverID   uint      `gorm:"column:receiver_id;not null;index"`
	SenderID     *uint     `gorm:"column:sender_id"`
	SenderName   *string   `gorm:"column:sender_name;size:255"`
	SenderAvatar string    `gorm:"column:sender_avatar;size:255"`
	Type         string    `gorm:"column:type;size:32;not null"`
	TargetID     *uint     `gorm:"column:target_id"`
	PostID       *uint     `gorm:"column:post_id"`
	IsRead       bool      `gorm:"column:is_read;index"`
	CreatedAt    time.Time `gorm:"column:created_at"`
}

func (Notification) TableName() string { return "notifications" }

// Friendship 表示好友申请或已建立的双向好友关系。
type Friendship struct {
	ID          uint       `gorm:"column:id;primaryKey"`
	RequesterID uint       `gorm:"column:requester_id;not null;index"`
	AddresseeID uint       `gorm:"column:addressee_id;not null;index"`
	Status      string     `gorm:"column:status;size:20;not null;index"`
	CreatedAt   time.Time  `gorm:"column:created_at;not null"`
	AcceptedAt  *time.Time `gorm:"column:accepted_at"`
}

func (Friendship) TableName() string { return "friendships" }

// ChatGroup 是私聊群组；IsPublic 决定用户能否直接加入。
type ChatGroup struct {
	ID        uint      `gorm:"column:id;primaryKey"`
	Name      string    `gorm:"column:name;size:100;not null"`
	CreatorID uint      `gorm:"column:creator_id;not null;index"`
	IsPublic  bool      `gorm:"column:is_public;not null"`
	CreatedAt time.Time `gorm:"column:created_at;not null"`
}

func (ChatGroup) TableName() string { return "chat_groups" }

// ChatGroupMember 是群成员关系，同时保存该成员的群消息已读游标。
type ChatGroupMember struct {
	ID                uint      `gorm:"column:id;primaryKey"`
	GroupID           uint      `gorm:"column:group_id;not null;index;uniqueIndex:uq_group_member_pair,priority:1"`
	UserID            uint      `gorm:"column:user_id;not null;index;uniqueIndex:uq_group_member_pair,priority:2"`
	JoinedAt          time.Time `gorm:"column:joined_at;not null"`
	InvitedByID       *uint     `gorm:"column:invited_by_id"`
	LastReadMessageID *uint     `gorm:"column:last_read_message_id"`
}

func (ChatGroupMember) TableName() string { return "chat_group_members" }

// ChatGroupInvite 记录群成员邀请及 accept/reject 状态。
type ChatGroupInvite struct {
	ID          uint       `gorm:"column:id;primaryKey"`
	GroupID     uint       `gorm:"column:group_id;not null;index"`
	InviterID   uint       `gorm:"column:inviter_id;not null;index"`
	InviteeID   uint       `gorm:"column:invitee_id;not null;index"`
	Status      string     `gorm:"column:status;size:20;not null;index"`
	CreatedAt   time.Time  `gorm:"column:created_at;not null"`
	RespondedAt *time.Time `gorm:"column:responded_at"`
}

func (ChatGroupInvite) TableName() string { return "chat_group_invites" }

// Message 是私聊消息。双方删除使用两个独立时间戳，只有双方都删除后才真正清理记录。
type Message struct {
	ID                uint       `gorm:"column:id;primaryKey"`
	SenderID          uint       `gorm:"column:sender_id;not null;index"`
	ReceiverID        uint       `gorm:"column:receiver_id;not null;index"`
	Content           string     `gorm:"column:content;not null"`
	IsRead            bool       `gorm:"column:is_read;index"`
	CreatedAt         time.Time  `gorm:"column:created_at;index"`
	SenderDeletedAt   *time.Time `gorm:"column:sender_deleted_at;index"`
	ReceiverDeletedAt *time.Time `gorm:"column:receiver_deleted_at;index"`
}

func (Message) TableName() string { return "messages" }

// GroupMessage 是群消息，群成员的 last_read_message_id 以它的 ID 作为未读边界。
type GroupMessage struct {
	ID        uint      `gorm:"column:id;primaryKey"`
	GroupID   uint      `gorm:"column:group_id;not null;index"`
	SenderID  uint      `gorm:"column:sender_id;not null;index"`
	Content   string    `gorm:"column:content;not null"`
	CreatedAt time.Time `gorm:"column:created_at;not null;index"`
}

func (GroupMessage) TableName() string { return "group_messages" }

// AppVersion 是移动端版本发布记录，按 version_code 选择最新版本。
type AppVersion struct {
	ID          uint       `gorm:"column:id;primaryKey" json:"id"`
	VersionCode int        `gorm:"column:version_code;not null" json:"version_code"`
	VersionName string     `gorm:"column:version_name;not null" json:"version_name"`
	DownloadURL string     `gorm:"column:download_url;not null" json:"download_url"`
	UpdateLog   string     `gorm:"column:update_log;not null" json:"update_log"`
	ForceUpdate bool       `gorm:"column:force_update" json:"force_update"`
	CreatedAt   time.Time  `gorm:"column:created_at" json:"created_at"`
	UpdatedAt   *time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (AppVersion) TableName() string { return "app_versions" }
