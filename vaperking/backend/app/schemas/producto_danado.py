from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class ProductoDanadoCreate(BaseModel):
    fecha: date
    nombre_producto: str
    cantidad: int
    motivo: Optional[str] = None


class ProductoDanadoUpdate(BaseModel):
    fecha: Optional[date] = None
    nombre_producto: Optional[str] = None
    cantidad: Optional[int] = None
    motivo: Optional[str] = None


class ProductoDanadoResponse(BaseModel):
    id: int
    sede_id: int
    sede_nombre: Optional[str] = None
    usuario_id: int
    nombre_usuario: str
    fecha: date
    nombre_producto: str
    cantidad: int
    motivo: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True