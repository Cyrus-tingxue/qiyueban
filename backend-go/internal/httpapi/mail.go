package httpapi

import (
	"crypto/tls"
	"fmt"
	"net/smtp"

	"github.com/cyrusxyz/touqi/backend-go/internal/config"
)

func sendSMTP(cfg config.Config, to, subject, body string) error {
	if cfg.SMTPHost == "" {
		return fmt.Errorf("SMTP 未配置")
	}
	from := cfg.SMTPFrom
	if from == "" {
		from = cfg.SMTPUsername
	}
	msg := []byte("From: 柒月半论坛 <" + from + ">\r\nTo: " + to + "\r\nSubject: " + subject + "\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n" + body + "\r\n")
	addr := fmt.Sprintf("%s:%d", cfg.SMTPHost, cfg.SMTPPort)
	var auth smtp.Auth
	if cfg.SMTPUsername != "" {
		auth = smtp.PlainAuth("", cfg.SMTPUsername, cfg.SMTPPassword, cfg.SMTPHost)
	}
	if !cfg.SMTPUseTLS {
		return smtp.SendMail(addr, auth, from, []string{to}, msg)
	}
	conn, err := smtp.Dial(addr)
	if err != nil {
		return err
	}
	defer conn.Close()
	if err = conn.StartTLS(&tls.Config{ServerName: cfg.SMTPHost, MinVersion: tls.VersionTLS12}); err != nil {
		return err
	}
	if auth != nil {
		if err = conn.Auth(auth); err != nil {
			return err
		}
	}
	if err = conn.Mail(from); err != nil {
		return err
	}
	if err = conn.Rcpt(to); err != nil {
		return err
	}
	writer, err := conn.Data()
	if err != nil {
		return err
	}
	if _, err = writer.Write(msg); err != nil {
		_ = writer.Close()
		return err
	}
	if err = writer.Close(); err != nil {
		return err
	}
	return conn.Quit()
}
