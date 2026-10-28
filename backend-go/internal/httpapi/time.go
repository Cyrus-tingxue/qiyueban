package httpapi

import "time"

// Shanghai 是 API 对外展示时间使用的固定时区；数据库时间统一按 UTC 读取。
var Shanghai, _ = time.LoadLocation("Asia/Shanghai")

// formatTime 将数据库时间转换为客户端既有的 YYYY-MM-DD HH:mm 格式。
func formatTime(value *time.Time) string {
	if value == nil {
		return ""
	}
	v := *value
	if v.Location() == time.UTC || v.Location() == time.Local {
		v = v.UTC()
	}
	return v.In(Shanghai).Format("2006-01-02 15:04")
}
func formatTimeValue(value time.Time) string { return formatTime(&value) }
