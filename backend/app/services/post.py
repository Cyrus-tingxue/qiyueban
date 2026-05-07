import math
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from ..models.post import Post, Category, Reply, Like, ReplyLike
from ..models.user import User


def get_posts(db: Session, page: int = 1, page_size: int = 10, category: str = None, sort: str = "newest", search: str = None, author_id: int = None):
    query = db.query(Post)
    if category:
        query = query.filter(Post.category == category)
    if author_id:
        query = query.filter(Post.author_id == author_id)
    
    if search:
        query = query.outerjoin(User, Post.author_id == User.id)
        query = query.filter(or_(
            Post.title.ilike(f"%{search}%"), 
            Post.content.ilike(f"%{search}%"),
            Post.author_name.ilike(f"%{search}%"),
            User.username.ilike(f"%{search}%")
        ))
    
    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    
    if sort == "likes":
        query = query.order_by(Post.like_count.desc(), Post.created_at.desc())
    else:
        query = query.order_by(Post.created_at.desc())

    items = (
        query
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    
    # 填充 author_avatar
    author_ids = [item.author_id for item in items]
    if author_ids:
        users = db.query(User.id, User.avatar).filter(User.id.in_(author_ids)).all()
        avatar_map = {u.id: u.avatar for u in users}
        for item in items:
            item.author_avatar = avatar_map.get(item.author_id, "")
    else:
        for item in items:
            item.author_avatar = ""

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


def get_post(db: Session, post_id: int):
    post = db.query(Post).filter(Post.id == post_id).first()
    if post:
        user = db.query(User.avatar).filter(User.id == post.author_id).first()
        post.author_avatar = user.avatar if user else ""
    return post


def create_post(db: Session, title: str, content: str, category: str, author_id: int, author_name: str, image_url: str = None):
    # Ensure category exists, else fallback to a default
    cat_obj = db.query(Category).filter(Category.name == category).first()
    if not cat_obj:
        category = "讨论"

    post = Post(
        title=title,
        content=content,
        category=category,
        author_id=author_id,
        author_name=author_name,
        image_url=image_url,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def update_post(db: Session, post_id: int, **kwargs):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        return None
    for key, value in kwargs.items():
        if value is not None:
            setattr(post, key, value)
    db.commit()
    db.refresh(post)
    return post


def delete_post(db: Session, post_id: int):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        return False
    
    from ..models.post import Like, Reply, ReplyLike
    
    # 获取帖子下所有的回复 id
    reply_ids = [r.id for r in post.replies]
    if reply_ids:
        # 删除这些回复相关的点赞
        db.query(ReplyLike).filter(ReplyLike.reply_id.in_(reply_ids)).delete(synchronize_session=False)
    
    # 删除该帖子的所有主贴点赞
    db.query(Like).filter(Like.post_id == post_id).delete(synchronize_session=False)
    
    # 删除所有回复（也可以依赖 post.replies 的 cascade，但手动调用 delete() 更确保不报外键约束错）
    db.query(Reply).filter(Reply.post_id == post_id).delete(synchronize_session=False)
    
    # 最后删除帖子本身
    db.delete(post)
    db.commit()
    return True


def get_categories(db: Session):
    return db.query(Category).all()


def init_categories(db: Session):
    """初始化默认分类"""
    defaults = ["讨论", "探灵", "灵异", "求助", "分享", "语c", "OC投稿"]
    for name in defaults:
        if not db.query(Category).filter(Category.name == name).first():
            db.add(Category(name=name))
    db.commit()


def get_replies(db: Session, post_id: int):
    """获取帖子下所有回复"""
    replies = (
        db.query(Reply)
        .filter(Reply.post_id == post_id)
        .order_by(Reply.created_at.asc())
        .all()
    )
    # 填充 author_avatar
    author_ids = list({r.author_id for r in replies})
    if author_ids:
        users = db.query(User.id, User.avatar).filter(User.id.in_(author_ids)).all()
        avatar_map = {u.id: u.avatar for u in users}
        for r in replies:
            r.author_avatar = avatar_map.get(r.author_id, "")
    else:
        for r in replies:
            r.author_avatar = ""
    return replies


import re
from ..models.notification import Notification

def create_reply(
    db: Session, 
    post_id: int, 
    content: str, 
    author_id: int, 
    author_name: str,
    reply_to_id: int = None,
    reply_to_user_id: int = None,
    reply_to_username: str = None,
    image_url: str = None,
):
    """创建回复并触发相关通知"""
    reply = Reply(
        content=content,
        post_id=post_id,
        author_id=author_id,
        author_name=author_name,
        image_url=image_url,
        reply_to_id=reply_to_id,
        reply_to_user_id=reply_to_user_id,
        reply_to_username=reply_to_username
    )
    db.add(reply)
    # 递增帖子回复数
    post = db.query(Post).filter(Post.id == post_id).first()
    if post:
        post.reply_count = (post.reply_count or 0) + 1
    db.commit()
    db.refresh(reply)

    # ---------- 处理通知逻辑 ----------
    # 查找并派发 @ 提及通知（使用一个集合去重并剔除自己）
    mention_pattern = re.compile(r'@([\w\u4e00-\u9fa5]+)')
    mentioned_names = set(mention_pattern.findall(content))
    if mentioned_names:
        users = db.query(User).filter(User.username.in_(list(mentioned_names))).all()
        for u in users:
            if u.id != author_id:
                notif = Notification(
                    receiver_id=u.id,
                    sender_id=author_id,
                    sender_name=author_name,
                    # sender_avatar 在获取列表时再关联或在前端根据 sender_name 读取，此处不硬存
                    type='mention',
                    target_id=reply.id,
                    post_id=post_id
                )
                db.add(notif)
    
    # 派发普通回复通知 (如果不属于@里面且被回复者不是自己)
    notified_receiver_id = None
    if reply_to_user_id and reply_to_user_id != author_id:
        notified_receiver_id = reply_to_user_id
    elif not reply_to_user_id and post and post.author_id != author_id:
        # 如果是直接回复主帖
        notified_receiver_id = post.author_id
        
    if notified_receiver_id:
        # 防止刚刚 mention 里已经发过一次通知，造成双重提醒
        # 如果此人刚好也被 @ 了，那只发 mention 通知就行，或者二选一均可
        # 这里保险起见直接补发一个 reply 类型的通知
        notif = Notification(
            receiver_id=notified_receiver_id,
            sender_id=author_id,
            sender_name=author_name,
            type='reply',
            target_id=reply.id,
            post_id=post_id
        )
        db.add(notif)
        
    db.commit()
    # --------------------------------

    return reply


def toggle_like(db: Session, post_id: int, user_id: int):
    """切换点赞状态"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        return None, False

    like = db.query(Like).filter(Like.post_id == post_id, Like.user_id == user_id).first()
    
    if like:
        # 已经点赞，取消点赞
        db.delete(like)
        post.like_count = max(0, (post.like_count or 0) - 1)
        is_liked = False
    else:
        # 未点赞，添加点赞
        new_like = Like(post_id=post_id, user_id=user_id)
        db.add(new_like)
        post.like_count = (post.like_count or 0) + 1
        is_liked = True

    db.commit()
    return post, is_liked


def is_post_liked_by_user(db: Session, post_id: int, user_id: int) -> bool:
    """检查用户是否已点赞某帖子"""
    if not user_id:
        return False
    return db.query(Like).filter(Like.post_id == post_id, Like.user_id == user_id).first() is not None


def delete_reply(db: Session, reply_id: int):
    """删除回帖并递减帖子的 reply_count"""
    reply = db.query(Reply).filter(Reply.id == reply_id).first()
    if not reply:
        return False
    
    # 递减关联帖子的回复数
    post = db.query(Post).filter(Post.id == reply.post_id).first()
    if post:
        post.reply_count = max(0, (post.reply_count or 0) - 1)
        
    db.delete(reply)
    db.commit()
    return True


def toggle_reply_like(db: Session, reply_id: int, user_id: int):
    """切换回帖点赞状态"""
    reply = db.query(Reply).filter(Reply.id == reply_id).first()
    if not reply:
        return None, False

    like = db.query(ReplyLike).filter(ReplyLike.reply_id == reply_id, ReplyLike.user_id == user_id).first()
    
    if like:
        # 已点赞，取消点赞
        db.delete(like)
        reply.like_count = max(0, (reply.like_count or 0) - 1)
        is_liked = False
    else:
        # 未点赞，添加点赞
        new_like = ReplyLike(reply_id=reply_id, user_id=user_id)
        db.add(new_like)
        reply.like_count = (reply.like_count or 0) + 1
        is_liked = True

    db.commit()
    return reply, is_liked


def get_user_liked_replies(db: Session, post_id: int, user_id: int) -> list[int]:
    """获取某帖子下用户点赞过的所有回帖ID（批量拉取状态用）"""
    if not user_id:
        return []
    likes = (
        db.query(ReplyLike.reply_id)
        .join(Reply, ReplyLike.reply_id == Reply.id)
        .filter(Reply.post_id == post_id, ReplyLike.user_id == user_id)
        .all()
    )
    return [r[0] for r in likes]
