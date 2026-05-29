from sqlalchemy.orm import Session
from app.models.usuario import Usuario
from app.utils.security import verify_password, crear_token
from app.schemas.auth import LoginResponse
from fastapi import Depends
from app.dependencies import get_current_user


class AuthService:
    @staticmethod
    def login(db: Session, username: str, password: str) -> LoginResponse | None:
        print(f"=== INTENTO DE LOGIN ===")
        print(f"Username: {username}")
        
        user = db.query(Usuario).filter(
            Usuario.username == username,
            Usuario.activo == True
        ).first()

        if not user:
            print("Usuario no existe")
            return None
        
        print(f"Usuario encontrado: {user.username}")
        print(f"Rol en BD: {user.rol}")
        
        if not verify_password(password, user.password_hash):
            print("Contraseña incorrecta")
            return None

        token = crear_token({"sub": str(user.id), "username": user.username, "rol": user.rol})

        return LoginResponse(
            access_token=token,
            usuario={
                "id": user.id,
                "username": user.username,
                "nombre_completo": user.nombre_completo,
                "rol": user.rol,
                "sede_id": user.sede_id
            }
        )

    @staticmethod
    def get_current_user(current_user=Depends(get_current_user)):
        return current_user