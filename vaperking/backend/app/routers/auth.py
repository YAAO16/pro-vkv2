from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import LoginRequest, LoginResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    result = AuthService.login(db, request.username, request.password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )
    return result


@router.get("/me")
def get_me(current_user=Depends(AuthService.get_current_user)):
    rol_value = current_user.rol.value if hasattr(current_user.rol, 'value') else current_user.rol
    return {
        "id": current_user.id,
        "username": current_user.username,
        "nombre_completo": current_user.nombre_completo,
        "rol": rol_value,
        "sede_id": current_user.sede_id
    }