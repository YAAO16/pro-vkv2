from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Venta, VentaDetalle, Producto, Usuario, Sede
from app.decorators import audit  # ← NUEVO

router = APIRouter()

def normalizar_metodo_pago(valor: str) -> str:
    lower = valor.lower()
    if lower not in ["efectivo", "transferencia", "mixto"]:
        raise HTTPException(400, "Método de pago inválido")
    return lower

class VentaDetalleCreate(BaseModel):
    producto_id: int
    cantidad: int
    precio_unit: float
    precio_original: Optional[float] = None
    subtotal: float

class VentaCreate(BaseModel):
    sede_id: int
    usuario_id: int
    total: float
    metodo_pago: str
    efectivo: Optional[float] = None
    transferencia: Optional[float] = None
    notas: Optional[str] = None
    detalles: List[VentaDetalleCreate]

class AnularVentaRequest(BaseModel):
    motivo: str

@router.get("/")
def get_ventas(
    limit: int = 10,
    offset: int = 0,
    sede_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Venta)
    if sede_id:
        query = query.filter(Venta.sede_id == sede_id)

    total = query.count()
    ventas = query.order_by(Venta.created_at.desc()).offset(offset).limit(limit).all()

    return {"ventas": ventas, "total": total, "limit": limit, "offset": offset}

@router.get("/{venta_id}/detalles")
def get_venta_detalles(
    venta_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    detalles = db.query(VentaDetalle).filter(VentaDetalle.venta_id == venta_id).all()
    return detalles

@router.post("/")
@audit(accion="crear_venta", tabla="ventas")  # ← DECORADOR
def crear_venta(
    request: Request,  # ← NUEVO
    venta_data: VentaCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    usuario = db.query(Usuario).filter(Usuario.id == venta_data.usuario_id).first()
    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")

    sede = db.query(Sede).filter(Sede.id == venta_data.sede_id).first()
    if not sede:
        raise HTTPException(404, "Sede no encontrada")

    for detalle in venta_data.detalles:
        producto = db.query(Producto).filter(Producto.id == detalle.producto_id).first()
        if not producto:
            raise HTTPException(404, f"Producto {detalle.producto_id} no encontrado")

    nueva_venta = Venta(
        sede_id=venta_data.sede_id,
        usuario_id=venta_data.usuario_id,
        total=venta_data.total,
        metodo_pago=normalizar_metodo_pago(venta_data.metodo_pago),
        efectivo=venta_data.efectivo,
        transferencia=venta_data.transferencia,
        notas=venta_data.notas,
        created_at=datetime.now()
    )
    db.add(nueva_venta)
    db.flush()

    for detalle in venta_data.detalles:
        nuevo_detalle = VentaDetalle(
            venta_id=nueva_venta.id,
            producto_id=detalle.producto_id,
            cantidad=detalle.cantidad,
            precio_unit=detalle.precio_unit,
            precio_original=detalle.precio_original,
            subtotal=detalle.subtotal
        )
        db.add(nuevo_detalle)

    db.commit()

    return {"message": "Venta creada exitosamente", "venta_id": nueva_venta.id}

@router.post("/{venta_id}/anular")
@audit(accion="anular_venta", tabla="ventas")  # ← DECORADOR
def anular_venta(
    request: Request,  # ← NUEVO
    venta_id: int,
    request_data: AnularVentaRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    venta = db.query(Venta).filter(Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if venta.anulada:
        raise HTTPException(status_code=400, detail="La venta ya está anulada")

    venta.anulada = True
    venta.anulada_por = current_user.id
    venta.motivo_anulacion = request_data.motivo

    db.commit()

    return {"message": "Venta anulada correctamente"}