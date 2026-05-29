from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from app.models.venta import MetodoPago  # Importar desde models


class VentaDetalleCreate(BaseModel):
    producto_id: int
    cantidad: int
    precio_unit: float


class VentaCreate(BaseModel):
    sede_id: int
    metodo_pago: MetodoPago  # Usar el Enum
    productos: List[VentaDetalleCreate]
    notas: Optional[str] = None


class VentaDetalleResponse(BaseModel):
    id: int
    producto_id: int
    nombre_producto: str
    cantidad: int
    precio_unit: float
    subtotal: float


class VentaResponse(BaseModel):
    id: int
    sede_id: int
    usuario_id: int
    nombre_vendedor: str
    total: float
    metodo_pago: MetodoPago
    created_at: datetime
    notas: Optional[str]
    anulada: bool
    detalles: List[VentaDetalleResponse]
    
    class Config:
        from_attributes = True