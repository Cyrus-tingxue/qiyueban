package httpapi

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"math/rand"
	"net/http"
	"net/mail"
	"regexp"
	"strings"
	"time"

	"github.com/cyrusxyz/touqi/backend-go/internal/model"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

var emailPattern = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

func bcryptBytes(value string) []byte {
	b := []byte(value)
	if len(b) > 72 {
		b = b[:72]
	}
	return b
}
func hashPassword(value string) (string, error) {
	encoded, err := bcrypt.GenerateFromPassword(bcryptBytes(value), bcrypt.DefaultCost)
	return string(encoded), err
}
func checkPassword(hash, value string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), bcryptBytes(value))
}
func normalizeEmail(value string) string { return strings.ToLower(strings.TrimSpace(value)) }
func validEmail(value string) bool {
	value = normalizeEmail(value)
	if !emailPattern.MatchString(value) {
		return false
	}
	_, err := mail.ParseAddress(value)
	return err == nil
}
func hashCode(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}
func randomCode() string { return fmt.Sprintf("%06d", rand.Intn(1000000)) }
func sameSecret(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

func (s *Server) searchUsers(c *gin.Context) {
	term := strings.TrimSpace(c.Query("q"))
	limit := parseBounded(c.Query("limit"), 10, 1, 100)
	if term == "" {
		c.JSON(http.StatusOK, []gin.H{})
		return
	}
	var users []model.User
	like := "%" + term + "%"
	s.DB.Where("username ILIKE ? OR nickname ILIKE ?", like, like).Limit(limit).Find(&users)
	result := make([]gin.H, 0, len(users))
	for i := range users {
		result = append(result, s.userResponse(&users[i]))
	}
	c.JSON(http.StatusOK, result)
}

func (s *Server) sendEmailCode(c *gin.Context) {
	user := userFrom(c)
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	if checkPassword(user.PasswordHash, in.Password) != nil {
		Error(c, 400, "密码错误")
		return
	}
	email := normalizeEmail(in.Email)
	if !validEmail(email) {
		Error(c, 400, "邮箱格式不正确")
		return
	}
	var other model.User
	if s.DB.Where("email = ? AND id <> ?", email, user.ID).First(&other).Error == nil {
		Error(c, 400, "邮箱已被绑定")
		return
	}
	code := randomCode()
	expires := time.Now().UTC().Add(10 * time.Minute)
	s.DB.Model(user).Updates(map[string]any{"pending_email": email, "email_verification_code_hash": hashCode(code), "email_verification_expires_at": expires})
	if s.Cfg.SMTPHost == "" {
		Error(c, 500, "邮件服务未配置，无法发送验证码邮件")
		return
	}
	// SMTP integration is intentionally isolated; a deployment can replace sendMail without changing API behavior.
	if err := s.sendMail(email, "柒月半论坛邮箱绑定验证码", "你正在进行柒月半论坛邮箱绑定。\n\n你的验证码是："+code+"\n\n验证码 10 分钟内有效。\n"); err != nil {
		Error(c, 500, "验证邮件发送失败，请稍后再试")
		return
	}
	Detail(c, "验证码已发送，请查看邮箱")
}

func (s *Server) confirmEmail(c *gin.Context) {
	user := userFrom(c)
	var in struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	email := normalizeEmail(in.Email)
	var other model.User
	if s.DB.Where("email = ? AND id <> ?", email, user.ID).First(&other).Error == nil {
		Error(c, 400, "邮箱已被绑定")
		return
	}
	if user.PendingEmail == nil || *user.PendingEmail != email || user.EmailVerificationCodeHash == nil || user.EmailVerificationExpiresAt == nil || time.Now().UTC().After(*user.EmailVerificationExpiresAt) || !sameSecret(*user.EmailVerificationCodeHash, hashCode(strings.TrimSpace(in.Code))) {
		Error(c, 400, "验证码错误或已过期")
		return
	}
	s.DB.Model(user).Updates(map[string]any{"email": email, "email_verified": true, "pending_email": nil, "email_verification_code_hash": nil, "email_verification_expires_at": nil})
	s.DB.First(user, user.ID)
	c.JSON(200, s.userResponse(user))
}

func (s *Server) forgotPassword(c *gin.Context) {
	var in struct {
		Email string `json:"email"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	email := normalizeEmail(in.Email)
	if !validEmail(email) {
		Error(c, 400, "邮箱格式不正确")
		return
	}
	generic := gin.H{"detail": "如果邮箱已绑定账号，验证码将发送到该邮箱"}
	var user model.User
	if s.DB.Where("email = ? AND email_verified = ?", email, true).First(&user).Error != nil {
		c.JSON(200, generic)
		return
	}
	code := randomCode()
	expires := time.Now().UTC().Add(10 * time.Minute)
	s.DB.Model(&user).Updates(map[string]any{"password_reset_token_hash": hashCode(code), "password_reset_expires_at": expires})
	if s.Cfg.SMTPHost == "" {
		Error(c, 500, "邮件服务未配置，无法发送重置邮件")
		return
	}
	if err := s.sendMail(email, "Password reset code", "Your verification code is: "+code+"\n\nThis code expires in 10 minutes.\n"); err != nil {
		Error(c, 500, "邮件发送失败，请稍后再试")
		return
	}
	c.JSON(200, generic)
}

func (s *Server) resetPassword(c *gin.Context) {
	var in struct {
		Email       string `json:"email"`
		Code        string `json:"code"`
		NewPassword string `json:"new_password"`
	}
	if c.ShouldBindJSON(&in) != nil {
		Error(c, 400, "请求参数无效")
		return
	}
	if len(in.NewPassword) < 4 {
		Error(c, 400, "新密码至少 4 个字符")
		return
	}
	email := normalizeEmail(in.Email)
	if !validEmail(email) {
		Error(c, 400, "邮箱格式不正确")
		return
	}
	var user model.User
	if s.DB.Where("email = ? AND email_verified = ?", email, true).First(&user).Error != nil || user.PasswordResetTokenHash == nil || user.PasswordResetExpiresAt == nil || time.Now().UTC().After(*user.PasswordResetExpiresAt) || !sameSecret(*user.PasswordResetTokenHash, hashCode(strings.TrimSpace(in.Code))) {
		Error(c, 400, "验证码错误或已过期")
		return
	}
	hash, err := hashPassword(in.NewPassword)
	if err != nil {
		Error(c, 500, "密码重置失败")
		return
	}
	s.DB.Model(&user).Updates(map[string]any{"password_hash": hash, "password_reset_token_hash": nil, "password_reset_expires_at": nil})
	Detail(c, "密码已重置，请重新登录")
}

func (s *Server) sendMail(to, subject, body string) error { return sendSMTP(s.Cfg, to, subject, body) }
