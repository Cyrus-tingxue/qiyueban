package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/cyrusxyz/touqi/backend-go/internal/config"
	"github.com/cyrusxyz/touqi/backend-go/internal/db"
	"github.com/cyrusxyz/touqi/backend-go/internal/httpapi"
)

// main 组装配置、数据库和 Gin 路由，并在收到 SIGINT/SIGTERM 时优雅关闭 HTTP 服务。
func main() {
	cfg := config.Load()
	database, err := db.Open(cfg)
	if err != nil {
		log.Fatal(err)
	}
	server := httpapi.New(database, cfg)
	httpServer := &http.Server{Addr: ":" + cfg.Port, Handler: server.Router(), ReadHeaderTimeout: 10 * time.Second}
	go func() {
		log.Printf("Go API listening on %s", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_ = httpServer.Shutdown(ctx)
}
