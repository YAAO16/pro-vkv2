from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ObservacionCreate(BaseModel):
    observacion: str


class ObservacionUpdate(BaseModel):
    observacion: Optional[str] = None


class ObservacionResponse(BaseModel):
    id: int
    sede_id: int
    sede_nombre: Optional[str] = None
    usuario_id: int
    nombre_usuario: str
    observacion: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True