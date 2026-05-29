from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.security import verificar_token
from app.models.usuario import Usuario

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Usuario:
    try:
        payload = verificar_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token inválido")

        user = db.query(Usuario).filter(Usuario.id == int(user_id)).first()
        if not user or not user.activo:
            raise HTTPException(status_code=401, detail="Usuario inactivo o no encontrado")

        return user
    except ValueError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


def require_roles(*roles: str):
    def checker(current_user: Usuario = Depends(get_current_user)):
        user_rol = current_user.rol
        if user_rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permisos insuficientes. Se requiere: {', '.join(roles)}"
            )
        return current_user
    return checker