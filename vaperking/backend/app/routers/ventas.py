from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from typing import Optional, List
from app.database import get_db
from app.dependencies import require_roles
from app.models.venta import Venta, VentaDetalle, MetodoPago
from app.models.producto import Producto
from app.models.sede import Sede
from app.models.usuario import Usuario
from pydantic import BaseModel

router = APIRouter(tags=["Ventas"])


# ========== SCHEMAS ==========
class VentaDetalleResponse(BaseModel):
    id: int
    producto_id: int
    nombre_producto: str
    cantidad: int
    precio_unit: float
    subtotal: float


class VentaDetalleCreate(BaseModel):
    producto_id: int
    cantidad: int
    precio_unit: float


class VentaCreate(BaseModel):
    sede_id: int
    metodo_pago: str
    notas: Optional[str] = None
    detalles: List[VentaDetalleCreate]


# ========== ENDPOINTS ==========

@router.get("/", response_model=dict)
def get_ventas(
    sede_id: Optional[int] = Query(None),
    usuario_id: Optional[int] = Query(None),
    fecha: Optional[date] = Query(None),
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    metodo_pago: Optional[str] = Query(None),
    anulada: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Obtiene la lista de ventas con filtros"""
    query = db.query(Venta)
    
    if current_user.rol == "vendedor":
        query = query.filter(Venta.usuario_id == current_user.id)
    
    if sede_id:
        query = query.filter(Venta.sede_id == sede_id)
    
    if usuario_id and current_user.rol == "admin":
        query = query.filter(Venta.usuario_id == usuario_id)
    
    if fecha:
        query = query.filter(func.date(Venta.created_at) == fecha)
    
    if fecha_inicio:
        query = query.filter(func.date(Venta.created_at) >= fecha_inicio)
    
    if fecha_fin:
        query = query.filter(func.date(Venta.created_at) <= fecha_fin)
    
    if metodo_pago:
        query = query.filter(Venta.metodo_pago == metodo_pago)
    
    if anulada is not None:
        query = query.filter(Venta.anulada == anulada)
    
    total = query.count()
    ventas = query.order_by(Venta.created_at.desc()).offset(offset).limit(limit).all()
    
    result = []
    for v in ventas:
        sede_nombre = None
        if v.sede_id:
            sede = db.query(Sede).filter(Sede.id == v.sede_id).first()
            sede_nombre = sede.nombre if sede else None
        
        nombre_usuario = None
        if v.usuario_id:
            usuario = db.query(Usuario).filter(Usuario.id == v.usuario_id).first()
            nombre_usuario = usuario.nombre_completo if usuario else None
        
        result.append({
            "id": v.id,
            "sede_id": v.sede_id,
            "sede_nombre": sede_nombre,
            "usuario_id": v.usuario_id,
            "nombre_usuario": nombre_usuario,
            "total": v.total,
            "metodo_pago": v.metodo_pago,
            "created_at": v.created_at,
            "notas": v.notas,
            "anulada": v.anulada
        })
    
    return {
        "total": total,
        "ventas": result
    }


@router.get("/{venta_id}/detalles", response_model=List[VentaDetalleResponse])
def get_venta_detalles(
    venta_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Obtiene los detalles de una venta específica"""
    venta = db.query(Venta).filter(Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    if current_user.rol == "vendedor" and venta.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tiene permisos para ver esta venta")
    
    detalles = db.query(
        VentaDetalle.id,
        VentaDetalle.producto_id,
        Producto.nombre.label("nombre_producto"),
        VentaDetalle.cantidad,
        VentaDetalle.precio_unit,
        VentaDetalle.subtotal
    ).join(
        Producto, VentaDetalle.producto_id == Producto.id
    ).filter(
        VentaDetalle.venta_id == venta_id
    ).all()
    
    return [
        VentaDetalleResponse(
            id=d.id,
            producto_id=d.producto_id,
            nombre_producto=d.nombre_producto,
            cantidad=d.cantidad,
            precio_unit=d.precio_unit,
            subtotal=d.subtotal
        )
        for d in detalles
    ]


@router.post("/", response_model=dict)
def create_venta(
    venta: VentaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Registra una nueva venta"""
    sede = db.query(Sede).filter(Sede.id == venta.sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    if not venta.detalles:
        raise HTTPException(status_code=400, detail="Debe agregar al menos un producto")
    
    total = sum(d.cantidad * d.precio_unit for d in venta.detalles)
    
    nueva_venta = Venta(
        sede_id=venta.sede_id,
        usuario_id=current_user.id,
        total=total,
        metodo_pago=venta.metodo_pago,
        notas=venta.notas,
        anulada=False
    )
    db.add(nueva_venta)
    db.flush()
    
    for detalle in venta.detalles:
        producto = db.query(Producto).filter(Producto.id == detalle.producto_id).first()
        if not producto:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Producto {detalle.producto_id} no encontrado")
        
        nuevo_detalle = VentaDetalle(
            venta_id=nueva_venta.id,
            producto_id=detalle.producto_id,
            cantidad=detalle.cantidad,
            precio_unit=detalle.precio_unit,
            subtotal=detalle.cantidad * detalle.precio_unit
        )
        db.add(nuevo_detalle)
    
    db.commit()
    
    return {
        "message": "Venta registrada exitosamente",
        "venta_id": nueva_venta.id,
        "total": total
    }


@router.delete("/{venta_id}", response_model=dict)
def anular_venta(
    venta_id: int,
    motivo: str = Query(..., description="Motivo de la anulación"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Anula una venta existente"""
    venta = db.query(Venta).filter(Venta.id == venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    if venta.anulada:
        raise HTTPException(status_code=400, detail="La venta ya está anulada")
    
    if current_user.rol == "vendedor" and venta.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puede anular ventas de otros vendedores")
    
    venta.anulada = True
    venta.motivo_anulacion = motivo
    venta.anulada_por = current_user.id
    
    db.commit()
    
    return {
        "message": "Venta anulada exitosamente",
        "venta_id": venta_id
    }