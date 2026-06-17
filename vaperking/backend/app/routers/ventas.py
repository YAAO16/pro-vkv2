from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Venta, VentaDetalle, Producto, Usuario, Sede

router = APIRouter()

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
    
    return {
        "ventas": ventas,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/{venta_id}")
def get_venta(
    venta_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    venta = db.query(Venta).filter(Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return venta

@router.get("/{venta_id}/detalles")
def get_venta_detalles(
    venta_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    venta = db.query(Venta).filter(Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    detalles = db.query(VentaDetalle).filter(VentaDetalle.venta_id == venta_id).all()
    return detalles

@router.post("/")
def crear_venta(
    venta: VentaCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verificar que el usuario existe
    usuario = db.query(Usuario).filter(Usuario.id == venta.usuario_id).first()
    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")
    
    # Verificar que la sede existe
    sede = db.query(Sede).filter(Sede.id == venta.sede_id).first()
    if not sede:
        raise HTTPException(404, "Sede no encontrada")
    
    # Verificar productos
    for detalle in venta.detalles:
        producto = db.query(Producto).filter(Producto.id == detalle.producto_id).first()
        if not producto:
            raise HTTPException(404, f"Producto {detalle.producto_id} no encontrado")
    
    # Crear venta
    nueva_venta = Venta(
        sede_id=venta.sede_id,
        usuario_id=venta.usuario_id,
        total=venta.total,
        metodo_pago=venta.metodo_pago,
        efectivo=venta.efectivo,
        transferencia=venta.transferencia,
        notas=venta.notas,
        created_at=datetime.now()
    )
    db.add(nueva_venta)
    db.flush()
    
    # Crear detalles
    for detalle in venta.detalles:
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
    
    return {
        "message": "Venta creada exitosamente",
        "venta_id": nueva_venta.id
    }

@router.post("/{venta_id}/anular")
def anular_venta(
    venta_id: int,
    request: AnularVentaRequest,
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
    venta.motivo_anulacion = request.motivo
    
    db.commit()
    
    return {"message": "Venta anulada correctamente"}