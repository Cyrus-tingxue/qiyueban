from pydantic import BaseModel


class AnnouncementResponse(BaseModel):
    content: str


class AnnouncementUpdate(BaseModel):
    content: str
