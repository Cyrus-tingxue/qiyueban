from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from . import Base

class AppVersion(Base):
    __tablename__ = "app_versions"

    id = Column(Integer, primary_key=True, index=True)
    version_code = Column(Integer, nullable=False, default=1)
    version_name = Column(String, nullable=False, default="1.0.0")
    download_url = Column(String, nullable=False, default="")
    update_log = Column(String, nullable=False, default="修复了一些Bug")
    force_update = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
