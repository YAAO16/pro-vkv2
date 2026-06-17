from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Permiso

router = APIRouter()

@router.get("/")
def get_permisos(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    permisos = db.query(Permiso).all()
    return permisos