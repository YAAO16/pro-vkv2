from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: dict


class UsuarioCreate(BaseModel):
    username: str
    nombre_completo: str
    password: str
    rol: str
    sede_id: Optional[int] = None


class UsuarioResponse(BaseModel):
    id: int
    username: str
    nombre_completo: str
    rol: str
    sede_id: Optional[int]
    activo: bool

    class Config:
        from_attributes = True