from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional


class SueldoVendedorCreate(BaseModel):
    usuario_id: int
    sede_id: int
    mes: int = Field(..., ge=1, le=12)
    ano: int = Field(..., ge=2020, le=2100)
    sueldo_base: float = Field(..., gt=0)
    comisiones: float = 0.0
    bonificaciones: float = 0.0
    deducciones: float = 0.0
    total: float
    fecha_pago: Optional[date] = None
    observaciones: Optional[str] = None
    estado: Optional[str] = "PENDIENTE"  # String


class SueldoVendedorUpdate(BaseModel):
    sueldo_base: Optional[float] = None
    comisiones: Optional[float] = None
    bonificaciones: Optional[float] = None
    deducciones: Optional[float] = None
    total: Optional[float] = None
    estado: Optional[str] = None
    fecha_pago: Optional[date] = None
    observaciones: Optional[str] = None


class SueldoVendedorResponse(BaseModel):
    id: int
    usuario_id: int
    nombre_usuario: str
    sede_id: int
    sede_nombre: str
    mes: int
    ano: int
    sueldo_base: float
    comisiones: float
    bonificaciones: float
    deducciones: float
    total: float
    estado: str
    fecha_pago: Optional[date]
    observaciones: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ResumenSueldosResponse(BaseModel):
    sede_id: int
    sede_nombre: str
    total_sueldos: float
    total_comisiones: float
    cantidad_vendedores: int