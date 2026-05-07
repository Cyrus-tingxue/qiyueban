from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from fastapi.staticfiles import StaticFiles
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from .config import CORS_ORIGINS
from .database import init_db, SessionLocal
from .routers import auth, posts, notifications, messages, uploads
from .services.post import init_categories
import os

# 从 X-Forwarded-For 中获取真实 IP，回退到 remote_address
def get_real_ip(request):
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)

# 速率限制器：按客户端 IP 限制
limiter = Limiter(key_func=get_real_ip, default_limits=["120/minute"])

app = FastAPI(title="柒月半 API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件挂载 (用于图片上传后的分发)
os.makedirs("/app/data/uploads", exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory="/app/data/uploads"), name="uploads")

# 路由
app.include_router(auth.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(messages.router, prefix="/api")


@app.on_event("startup")
def startup():
    init_db()
    # 初始化默认分类
    db = SessionLocal()
    try:
        init_categories(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok", "name": "柒月半 API"}
