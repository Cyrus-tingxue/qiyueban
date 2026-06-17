from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.app_version import AppVersion
from ..schemas.app_version import AppVersionCreate, AppVersionUpdate, AppVersionResponse
from ..dependencies import get_current_user

router = APIRouter()

@router.get("/latest", response_model=AppVersionResponse)
def get_latest_version(db: Session = Depends(get_db)):
    version = db.query(AppVersion).order_by(AppVersion.version_code.desc()).first()
    if not version:
        raise HTTPException(status_code=404, detail="No versions found")
    return version

@router.post("/", response_model=AppVersionResponse)
def create_version(
    version_in: AppVersionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    version = AppVersion(**version_in.model_dump())
    db.add(version)
    db.commit()
    db.refresh(version)
    return version

@router.put("/{version_id}", response_model=AppVersionResponse)
def update_version(
    version_id: int,
    version_in: AppVersionUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    version = db.query(AppVersion).filter(AppVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
        
    update_data = version_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(version, key, value)
        
    db.commit()
    db.refresh(version)
    return version
