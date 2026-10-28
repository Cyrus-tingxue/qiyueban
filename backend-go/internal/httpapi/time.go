package httpapi

import "time"

var Shanghai, _ = time.LoadLocation("Asia/Shanghai")

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
