from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional

class GastoBase(BaseModel):
    fecha: date
    motivo: str = Field(..., max_length=255)
    valor: float = Field(..., gt=0)
    descripcion: Optional[str] = None
    sede_id: int

class GastoCreate(GastoBase):
    pass

class GastoUpdate(BaseModel):
    fecha: Optional[date] = None
    motivo: Optional[str] = Field(None, max_length=255)
    valor: Optional[float] = Field(None, gt=0)
    descripcion: Optional[str] = None
    sede_id: Optional[int] = None

class GastoResponse(GastoBase):
    id: int
    usuario_id: int
    nombre_usuario: str
    nombre_sede: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class GastoResumen(BaseModel):
    total_gastos_hoy: float
    total_gastos_semana: float
    total_gastos_mes: float
    ultimos_gastos: list[GastoResponse]