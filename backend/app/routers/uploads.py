from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from ..dependencies import get_current_user
from ..models.user import User
import shutil
import uuid
import os
from pathlib import Path

router = APIRouter(tags=["上传"])

UPLOAD_DIR = Path("/app/data/uploads")
# 确保上传目录存在
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

@router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # 验证文件扩展名
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="不支持的文件格式")
    
    # 验证文件类型
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="只能上传图片文件")

    # 生成全局唯一文件名
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"图片保存失败: {str(e)}")
    
    # 返回可直接访问的静态链接（由于 Nginx 或 main.py 直接映射 /api/uploads/）
    image_url = f"/api/uploads/{filename}"
    return {"url": image_url}
