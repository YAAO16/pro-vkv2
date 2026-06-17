from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.core.security import verify_password, create_access_token
from app.models import Usuario

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(
        Usuario.username == request.username,
        Usuario.activo == True
    ).first()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )
    
    token_data = {
        "sub": str(user.id),
        "username": user.username,
        "rol": user.rol.value,
    }
    token = create_access_token(token_data)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": user.id,
            "username": user.username,
            "nombre_completo": user.nombre_completo,
            "rol": user.rol.value,
            "sede_id": user.sede_id
        }
    }