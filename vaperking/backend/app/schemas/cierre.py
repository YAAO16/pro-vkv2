from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class CierreDiarioCreate(BaseModel):
    sede_id: int
    fecha: date
    efectivo_reportado: float
    transferencia_reportada: float
    observaciones: Optional[str] = None


class CierreDiarioUpdate(BaseModel):
    efectivo_reportado: Optional[float] = None
    transferencia_reportada: Optional[float] = None
    observaciones: Optional[str] = None


class CierreDiarioResponse(BaseModel):
    id: int
    sede_id: int
    sede_nombre: Optional[str] = None
    fecha: date
    balance_sistema: float
    efectivo_reportado: float
    transferencia_reportada: float
    diferencia: float
    cerrado_por: Optional[int]
    nombre_usuario: Optional[str] = None
    observaciones: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CierrePreviewResponse(BaseModel):
    sede_id: int
    fecha: date
    balance_sistema: float
    ventas_efectivo: float
    ventas_transferencia: float
    total_ventas: int