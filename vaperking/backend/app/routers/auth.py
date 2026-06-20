from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.core.security import verify_password, create_access_token
from app.models import Usuario
from app.decorators import audit  # ← NUEVO

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
@audit(accion="login", tabla="usuarios")  # ← DECORADOR
def login(
    request: Request,  # ← NUEVO
    request_data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(Usuario).filter(
        Usuario.username == request_data.username,
        Usuario.activo == True
    ).first()

    if not user or not verify_password(request_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )

    token = create_access_token({"sub": str(user.id)})

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