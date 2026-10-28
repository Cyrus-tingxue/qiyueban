package model

import "time"

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

type Announcement struct {
	ID        uint      `gorm:"column:id;primaryKey"`
	Content   string    `gorm:"column:content;not null"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
}

func (Announcement) TableName() string { return "announcements" }

type Category struct {
	ID   uint   `gorm:"column:id;primaryKey"`
	Name string `gorm:"column:name;uniqueIndex;size:20;not null"`
	Icon string `gorm:"column:icon;size:255"`
}

func (Category) TableName() string { return "categories" }

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

type Like struct {
	ID        uint      `gorm:"column:id;primaryKey"`
	UserID    uint      `gorm:"column:user_id;not null;uniqueIndex:uq_user_post_like,priority:1"`
	PostID    uint      `gorm:"column:post_id;not null;uniqueIndex:uq_user_post_like,priority:2"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (Like) TableName() string { return "likes" }

type ReplyLike struct {
	ID        uint      `gorm:"column:id;primaryKey"`
	UserID    uint      `gorm:"column:user_id;not null;uniqueIndex:uq_user_reply_like,priority:1"`
	ReplyID   uint      `gorm:"column:reply_id;not null;uniqueIndex:uq_user_reply_like,priority:2"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (ReplyLike) TableName() string { return "reply_likes" }

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

type IpBan struct {
	ID          uint      `gorm:"column:id;primaryKey"`
	IPAddress   string    `gorm:"column:ip_address;uniqueIndex;size:64;not null"`
	Reason      *string   `gorm:"column:reason;size:500"`
	CreatedByID *uint     `gorm:"column:created_by_id"`
	CreatedAt   time.Time `gorm:"column:created_at"`
}

func (IpBan) TableName() string { return "ip_bans" }

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

type Friendship struct {
	ID          uint       `gorm:"column:id;primaryKey"`
	RequesterID uint       `gorm:"column:requester_id;not null;index"`
	AddresseeID uint       `gorm:"column:addressee_id;not null;index"`
	Status      string     `gorm:"column:status;size:20;not null;index"`
	CreatedAt   time.Time  `gorm:"column:created_at;not null"`
	AcceptedAt  *time.Time `gorm:"column:accepted_at"`
}

func (Friendship) TableName() string { return "friendships" }

type ChatGroup struct {
	ID        uint      `gorm:"column:id;primaryKey"`
	Name      string    `gorm:"column:name;size:100;not null"`
	CreatorID uint      `gorm:"column:creator_id;not null;index"`
	IsPublic  bool      `gorm:"column:is_public;not null"`
	CreatedAt time.Time `gorm:"column:created_at;not null"`
}

func (ChatGroup) TableName() string { return "chat_groups" }

type ChatGroupMember struct {
	ID                uint      `gorm:"column:id;primaryKey"`
	GroupID           uint      `gorm:"column:group_id;not null;index;uniqueIndex:uq_group_member_pair,priority:1"`
	UserID            uint      `gorm:"column:user_id;not null;index;uniqueIndex:uq_group_member_pair,priority:2"`
	JoinedAt          time.Time `gorm:"column:joined_at;not null"`
	InvitedByID       *uint     `gorm:"column:invited_by_id"`
	LastReadMessageID *uint     `gorm:"column:last_read_message_id"`
}

func (ChatGroupMember) TableName() string { return "chat_group_members" }

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

type GroupMessage struct {
	ID        uint      `gorm:"column:id;primaryKey"`
	GroupID   uint      `gorm:"column:group_id;not null;index"`
	SenderID  uint      `gorm:"column:sender_id;not null;index"`
	Content   string    `gorm:"column:content;not null"`
	CreatedAt time.Time `gorm:"column:created_at;not null;index"`
}

func (GroupMessage) TableName() string { return "group_messages" }

type AppVersion struct {
	ID          uint       `gorm:"column:id;primaryKey"`
	VersionCode int        `gorm:"column:version_code;not null"`
	VersionName string     `gorm:"column:version_name;not null"`
	DownloadURL string     `gorm:"column:download_url;not null"`
	UpdateLog   string     `gorm:"column:update_log;not null"`
	ForceUpdate bool       `gorm:"column:force_update"`
	CreatedAt   time.Time  `gorm:"column:created_at"`
	UpdatedAt   *time.Time `gorm:"column:updated_at"`
}

func (AppVersion) TableName() string { return "app_versions" }
