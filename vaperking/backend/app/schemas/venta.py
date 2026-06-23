from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class VentaDetalleCreate(BaseModel):
    producto_id: int
    cantidad: int
    precio_unit: float
    precio_original: Optional[float] = None
    subtotal: float

class VentaDetalleResponse(BaseModel):
    id: int
    producto_id: int
    cantidad: int
    precio_unit: float
    precio_original: Optional[float]
    subtotal: float

class VentaCreate(BaseModel):
    sede_id: int
    usuario_id: int
    total: float
    metodo_pago: str  # string
    efectivo: Optional[float] = None
    transferencia: Optional[float] = None
    notas: Optional[str] = None
    detalles: List[VentaDetalleCreate]

class VentaResponse(BaseModel):
    id: int
    sede_id: int
    usuario_id: int
    total: float
    metodo_pago: str  # string
    efectivo: Optional[float]
    transferencia: Optional[float]
    created_at: datetime
    notas: Optional[str]
    anulada: bool
    anulada_por: Optional[int]
    motivo_anulacion: Optional[str]
    detalles: List[VentaDetalleResponse] = []