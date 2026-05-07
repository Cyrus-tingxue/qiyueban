import os
import uuid
from typing import Optional
from openai import OpenAI
from sqlalchemy.orm import Session
from ..models.user import User
from ..database import SessionLocal
from .post import create_reply
from .auth import hash_password

XIAOQI_USERNAME = "xiaoqi_bot"
XIAOQI_NICKNAME = "小柒"
XIAOQI_AVATAR = "https://api.dicebear.com/9.x/avataaars/svg?seed=xiaoqi&backgroundColor=ffdfbf"

def get_xiaoqi_user(db: Session) -> User:
    user = db.query(User).filter(User.username == XIAOQI_USERNAME).first()
    if not user:
        random_pass = str(uuid.uuid4())
        hashed_pass = hash_password(random_pass)
        user = User(
            username=XIAOQI_USERNAME,
            nickname=XIAOQI_NICKNAME,
            password_hash=hashed_pass,
            avatar=XIAOQI_AVATAR,
            is_admin=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def generate_xiaoqi_reply_task(post_id: int, user_content: str, reply_to_id: Optional[int] = None, reply_to_user_id: Optional[int] = None, reply_to_username: Optional[str] = None):
    """
    Background task to generate a reply from Xiaoqi.
    """
    auth_token = os.environ.get("ANTHROPIC_AUTH_TOKEN", "")
    base_url = os.environ.get("ANTHROPIC_BASE_URL", "")
    model = os.environ.get("ANTHROPIC_MODEL", "")
    
    if not auth_token or not base_url or not model:
        print("AI Configuration is missing")
        return
        
    db = SessionLocal()
    try:
        xiaoqi = get_xiaoqi_user(db)
        
        if not base_url.endswith("/v1") and not base_url.endswith("/v1/"):
            base_url = base_url.rstrip("/") + "/v1"

        client = OpenAI(
            base_url=base_url,
            api_key=auth_token,
        )
        
        system_prompt = "你是小柒，一个活泼可爱、调皮捣蛋的小女孩，也是cyrus制作的AI。你的任务是在社区和大家聊天。回复时尽量简短自然，多用颜文字（比如 (≧▽≦), 哼😠, >_<）。不要长篇大论，表现得像个真人小女孩。"
        user_prompt = f"有位用户说了：{user_content}\n请你以小柒的身份回复他。"
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=256
        )
        
        reply_text = response.choices[0].message.content.strip()
        
        if reply_text and reply_to_username and not reply_text.startswith(f"@{reply_to_username}"):
            reply_text = f"@{reply_to_username} {reply_text}"
            
        if reply_text:
            create_reply(
                db=db,
                post_id=post_id,
                content=reply_text,
                author_id=xiaoqi.id,
                author_name=xiaoqi.nickname,
                reply_to_id=reply_to_id,
                reply_to_user_id=reply_to_user_id,
                reply_to_username=reply_to_username
            )
    except Exception as e:
        print(f"Failed to generate Xiaoqi reply: {e}")
    finally:
        db.close()
