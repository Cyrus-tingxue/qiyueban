from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.post import PostCreate, PostUpdate, PostResponse, PostListResponse, CategoryResponse, ReplyCreate, ReplyResponse
from ..services.post import get_posts, get_post, create_post, update_post, delete_post, get_categories, get_replies, create_reply, toggle_like, is_post_liked_by_user, toggle_reply_like, delete_reply, get_user_liked_replies
from ..dependencies import get_current_user, get_optional_user
from ..models.user import User
from typing import Optional, List
import zoneinfo
from datetime import timezone

shanghai_tz = zoneinfo.ZoneInfo("Asia/Shanghai")

def format_datetime(dt):
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(shanghai_tz).strftime("%Y-%m-%d %H:%M")

router = APIRouter(tags=["帖子"])


@router.get("/posts", response_model=PostListResponse)
def list_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    category: Optional[str] = None,
    sort: str = Query("newest", regex="^(newest|likes)$"),
    search: Optional[str] = None,
    author_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user), # 改为用 get_optional_user 防止 403 阻断请求
):
    result = get_posts(db, page, page_size, category, sort, search, author_id)
    items = [
        PostResponse(
            id=p.id,
            title=p.title,
            content=p.content,
            image_url=p.image_url,
            category=p.category,
            author=p.author_name,
            author_id=p.author_id,
            author_avatar=getattr(p, "author_avatar", ""),
            reply_count=p.reply_count,
            like_count=getattr(p, "like_count", 0),
            is_liked=False,
            created_at=format_datetime(p.created_at),
        )
        for p in result["items"]
    ]
    return PostListResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
    )


@router.get("/posts/{post_id}", response_model=PostResponse)
def read_post(post_id: int, db: Session = Depends(get_db)):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    return PostResponse(
        id=post.id,
        title=post.title,
        content=post.content,
        image_url=post.image_url,
        category=post.category,
        author=post.author_name,
        author_id=post.author_id,
        author_avatar=getattr(post, "author_avatar", ""),
        reply_count=post.reply_count,
        like_count=getattr(post, "like_count", 0),
        is_liked=False, # 具体点赞状态通过另一个 API 获取
        created_at=format_datetime(post.created_at),
    )


@router.post("/posts", response_model=PostResponse)
def new_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = create_post(db, data.title, data.content, data.category, current_user.id, current_user.nickname, image_url=data.image_url)
    return PostResponse(
        id=post.id,
        title=post.title,
        content=post.content,
        image_url=post.image_url,
        category=post.category,
        author=post.author_name,
        author_id=post.author_id,
        author_avatar=current_user.avatar,
        reply_count=post.reply_count,
        like_count=getattr(post, "like_count", 0),
        is_liked=False,
        created_at=format_datetime(post.created_at),
    )


@router.put("/posts/{post_id}", response_model=PostResponse)
def edit_post(
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = get_post(db, post_id)
    if not existing:
        raise HTTPException(status_code=404, detail="帖子不存在")
    if existing.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权编辑此帖子")

    post = update_post(db, post_id, title=data.title, content=data.content, category=data.category)
    return PostResponse(
        id=post.id,
        title=post.title,
        content=post.content,
        image_url=post.image_url,
        category=post.category,
        author=post.author_name,
        author_id=post.author_id,
        author_avatar=current_user.avatar,
        reply_count=post.reply_count,
        like_count=getattr(post, "like_count", 0),
        is_liked=False,
        created_at=format_datetime(post.created_at),
    )


@router.delete("/posts/{post_id}")
def remove_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = get_post(db, post_id)
    if not existing:
        raise HTTPException(status_code=404, detail="帖子不存在")
    if existing.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="无权删除此帖子")

    delete_post(db, post_id)
    return {"detail": "删除成功"}


@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    cats = get_categories(db)
    return [CategoryResponse(id=c.id, name=c.name, icon=c.icon or "") for c in cats]


@router.get("/posts/{post_id}/replies", response_model=List[ReplyResponse])
def list_replies(post_id: int, db: Session = Depends(get_db)):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    replies = get_replies(db, post_id)
    return [
        ReplyResponse(
            id=r.id,
            content=r.content,
            image_url=r.image_url,
            author=r.author_name,
            author_id=r.author_id,
            author_avatar=getattr(r, "author_avatar", ""),
            like_count=getattr(r, "like_count", 0),
            is_liked=False,
            reply_to_id=r.reply_to_id,
            reply_to_user_id=r.reply_to_user_id,
            reply_to_username=r.reply_to_username,
            created_at=format_datetime(r.created_at),
        )
        for r in replies
    ]


@router.post("/posts/{post_id}/like")
def toggle_post_like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post, is_liked = toggle_like(db, post_id, current_user.id)
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    return {"like_count": post.like_count, "is_liked": is_liked}


@router.get("/posts/{post_id}/like")
def check_post_like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    is_liked = is_post_liked_by_user(db, post_id, current_user.id)
    return {"like_count": post.like_count, "is_liked": is_liked}


@router.post("/posts/{post_id}/replies", response_model=ReplyResponse)
def new_reply(
    post_id: int,
    data: ReplyCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")
    reply = create_reply(
        db, 
        post_id, 
        data.content, 
        current_user.id, 
        current_user.nickname,
        reply_to_id=data.reply_to_id,
        reply_to_user_id=data.reply_to_user_id,
        reply_to_username=data.reply_to_username,
        image_url=data.image_url,
    )
    
    if "@小柒" in data.content:
        from ..services.ai import generate_xiaoqi_reply_task
        background_tasks.add_task(
            generate_xiaoqi_reply_task,
            post_id=post_id,
            user_content=data.content,
            reply_to_id=reply.id,
            reply_to_user_id=current_user.id,
            reply_to_username=current_user.nickname
        )

    return ReplyResponse(
        id=reply.id,
        content=reply.content,
        image_url=reply.image_url,
        author=reply.author_name,
        author_id=reply.author_id,
        author_avatar=current_user.avatar,
        like_count=0,
        is_liked=False,
        created_at=format_datetime(reply.created_at),
    )


@router.post("/posts/replies/{reply_id}/like")
def toggle_like_for_reply(
    reply_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reply, is_liked = toggle_reply_like(db, reply_id, current_user.id)
    if not reply:
        raise HTTPException(status_code=404, detail="回帖不存在")
    return {"like_count": reply.like_count, "is_liked": is_liked}


@router.delete("/posts/replies/{reply_id}")
def remove_reply(
    reply_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from ..models.post import Reply
    reply = db.query(Reply).filter(Reply.id == reply_id).first()
    if not reply:
        raise HTTPException(status_code=404, detail="回帖不存在")
    if reply.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="无权删除此回帖")
    
    delete_reply(db, reply_id)
    return {"detail": "删除成功"}


@router.get("/posts/{post_id}/replies/liked", response_model=List[int])
def get_liked_replies(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 返回当帖子中，该用户点过赞的所有 reply_id 列表
    return get_user_liked_replies(db, post_id, current_user.id)

