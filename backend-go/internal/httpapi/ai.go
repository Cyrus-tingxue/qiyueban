package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/cyrusxyz/touqi/backend-go/internal/model"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	xiaoqiUsername = "xiaoqi_bot"
	xiaoqiNickname = "小柒"
	xiaoqiAvatar   = "https://api.dicebear.com/9.x/avataaars/svg?seed=xiaoqi&backgroundColor=ffdfbf"
	xiaoqiPrompt   = "你是小柒，一个活泼可爱、调皮捣蛋的小女孩，也是cyrus制作的AI。你的任务是在社区和大家聊天。回复时尽量简短自然，多用颜文字（比如 (≧▽≦), 哼😠, >_<）。不要长篇大论，表现得像个真人小女孩。"
)

type chatCompletionRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
	MaxTokens   int           `json:"max_tokens"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatCompletionResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
}

// generateXiaoqiReply 在后台调用 OpenAI-compatible Chat Completions 接口。
// 触发条件和旧 Python 服务一致：只有回复正文包含“@小柒”时才调用，失败不影响用户提交回复。
func (s *Server) generateXiaoqiReply(reply model.Reply, post model.Post, author *model.User) {
	if s.Cfg.AIAuthToken == "" || s.Cfg.AIBaseURL == "" || s.Cfg.AIModel == "" {
		return
	}

	bot, err := s.xiaoqiUser()
	if err != nil {
		return
	}
	baseURL := strings.TrimRight(s.Cfg.AIBaseURL, "/")
	if !strings.HasSuffix(baseURL, "/v1") {
		baseURL += "/v1"
	}
	requestBody := chatCompletionRequest{
		Model: s.Cfg.AIModel,
		Messages: []chatMessage{
			{Role: "system", Content: xiaoqiPrompt},
			{Role: "user", Content: fmt.Sprintf("有位用户说了：%s\n请你以小柒的身份回复他。", reply.Content)},
		},
		Temperature: 0.7,
		MaxTokens:   256,
	}
	payload, err := json.Marshal(requestBody)
	if err != nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return
	}
	req.Header.Set("Authorization", "Bearer "+s.Cfg.AIAuthToken)
	req.Header.Set("Content-Type", "application/json")
	response, err := http.DefaultClient.Do(req)
	if err != nil {
		return
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return
	}
	var completion chatCompletionResponse
	if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&completion); err != nil || len(completion.Choices) == 0 {
		return
	}
	content := strings.TrimSpace(completion.Choices[0].Message.Content)
	if content == "" {
		return
	}
	if reply.ReplyToUsername != nil && *reply.ReplyToUsername != "" && !strings.HasPrefix(content, "@"+*reply.ReplyToUsername) {
		content = "@" + *reply.ReplyToUsername + " " + content
	}
	created := model.Reply{Content: content, PostID: post.ID, AuthorID: bot.ID, AuthorName: bot.Nickname, ReplyToID: &reply.ID, ReplyToUserID: &author.ID, ReplyToUsername: &author.Nickname}
	tx := s.DB.Begin()
	if tx.Error != nil {
		return
	}
	if err := tx.Create(&created).Error; err != nil {
		tx.Rollback()
		return
	}
	if err := tx.Model(&model.Post{}).Where("id = ?", post.ID).UpdateColumn("reply_count", gorm.Expr("reply_count + 1")).Error; err != nil {
		tx.Rollback()
		return
	}
	if err := tx.Commit().Error; err != nil {
		return
	}
}

// xiaoqiUser 查找或创建机器人账号。随机密码只用于满足 users.password_hash 的非空约束。
func (s *Server) xiaoqiUser() (*model.User, error) {
	var user model.User
	if err := s.DB.Where("username = ?", xiaoqiUsername).First(&user).Error; err == nil {
		return &user, nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(time.Now().String()), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user = model.User{Username: xiaoqiUsername, Nickname: xiaoqiNickname, PasswordHash: string(hash), Avatar: xiaoqiAvatar}
	if err := s.DB.Create(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}
