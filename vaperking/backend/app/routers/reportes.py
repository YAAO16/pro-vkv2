from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import date, timedelta
from typing import Optional
from app.database import get_db
from app.dependencies import require_roles
from app.models.venta import Venta, VentaDetalle, MetodoPago
from app.models.producto import Producto
from app.models.cierre_diario import CierreDiario
from app.models.usuario import Usuario
from app.models.sede import Sede  # <-- IMPORTANTE: Agregar esta línea
from pydantic import BaseModel

router = APIRouter()


# Schemas
class ReporteVentasResponse(BaseModel):
    fecha: date
    total_ventas: int
    total_ingresos: float
    efectivo: float
    transferencia: float
    ticket_promedio: float


class ReporteProductoResponse(BaseModel):
    producto_id: int
    nombre: str
    sku: str
    cantidad_vendida: int
    total_ingresos: float
    porcentaje: float


class ReporteAuditoriaResponse(BaseModel):
    fecha: date
    sede: str
    balance_sistema: float
    efectivo_reportado: float
    transferencia_reportada: float
    diferencia: float
    cerrado_por: str


@router.get("/ventas")
def reporte_ventas(
    fecha_inicio: date = Query(...),
    fecha_fin: date = Query(...),
    sede_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Reporte de ventas por período"""
    # Si es vendedor, solo su sede
    if current_user.rol == "vendedor":
        sede_id = current_user.sede_id
    
    query = db.query(
        cast(Venta.created_at, Date).label("fecha"),
        func.count(Venta.id).label("total_ventas"),
        func.sum(Venta.total).label("total_ingresos"),
        func.sum(func.if_(Venta.metodo_pago == MetodoPago.efectivo, Venta.total, 0)).label("efectivo"),
        func.sum(func.if_(Venta.metodo_pago == MetodoPago.transferencia, Venta.total, 0)).label("transferencia"),
    ).filter(
        cast(Venta.created_at, Date) >= fecha_inicio,
        cast(Venta.created_at, Date) <= fecha_fin,
        Venta.anulada == False
    )
    
    if sede_id:
        query = query.filter(Venta.sede_id == sede_id)
    
    resultados = query.group_by(cast(Venta.created_at, Date)).order_by("fecha").all()
    
    response = []
    for r in resultados:
        response.append(ReporteVentasResponse(
            fecha=r.fecha,
            total_ventas=r.total_ventas or 0,
            total_ingresos=float(r.total_ingresos or 0),
            efectivo=float(r.efectivo or 0),
            transferencia=float(r.transferencia or 0),
            ticket_promedio=float((r.total_ingresos or 0) / (r.total_ventas or 1))
        ))
    
    return response


@router.get("/productos-mas-vendidos")
def productos_mas_vendidos(
    fecha_inicio: date = Query(...),
    fecha_fin: date = Query(...),
    sede_id: Optional[int] = Query(None),
    limite: int = Query(10),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Reporte de productos más vendidos"""
    if current_user.rol == "vendedor":
        sede_id = current_user.sede_id
    
    query = db.query(
        Producto.id,
        Producto.nombre,
        Producto.sku,
        func.sum(VentaDetalle.cantidad).label("cantidad_vendida"),
        func.sum(VentaDetalle.subtotal).label("total_ingresos")
    ).join(
        VentaDetalle, VentaDetalle.producto_id == Producto.id
    ).join(
        Venta, Venta.id == VentaDetalle.venta_id
    ).filter(
        cast(Venta.created_at, Date) >= fecha_inicio,
        cast(Venta.created_at, Date) <= fecha_fin,
        Venta.anulada == False
    )
    
    if sede_id:
        query = query.filter(Venta.sede_id == sede_id)
    
    resultados = query.group_by(Producto.id).order_by(
        func.sum(VentaDetalle.cantidad).desc()
    ).limit(limite).all()
    
    # Calcular total de ingresos para porcentajes
    total_ingresos_query = db.query(func.sum(Venta.total)).filter(
        cast(Venta.created_at, Date) >= fecha_inicio,
        cast(Venta.created_at, Date) <= fecha_fin,
        Venta.anulada == False
    )
    if sede_id:
        total_ingresos_query = total_ingresos_query.filter(Venta.sede_id == sede_id)
    total_ingresos = total_ingresos_query.scalar() or 1
    
    response = []
    for r in resultados:
        response.append(ReporteProductoResponse(
            producto_id=r.id,
            nombre=r.nombre,
            sku=r.sku,
            cantidad_vendida=int(r.cantidad_vendida or 0),
            total_ingresos=float(r.total_ingresos or 0),
            porcentaje=float(((r.total_ingresos or 0) / total_ingresos) * 100)
        ))
    
    return response


@router.get("/auditoria")
def reporte_auditoria(
    fecha_inicio: date = Query(...),
    fecha_fin: date = Query(...),
    sede_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Reporte de auditoría (cierres diarios) - solo admin"""
    query = db.query(
        CierreDiario.fecha,
        CierreDiario.sede_id,
        CierreDiario.balance_sistema,
        CierreDiario.efectivo_reportado,
        CierreDiario.transferencia_reportada,
        CierreDiario.diferencia,
        Usuario.username.label("cerrado_por")
    ).join(
        Usuario, Usuario.id == CierreDiario.cerrado_por, isouter=True
    ).filter(
        CierreDiario.fecha >= fecha_inicio,
        CierreDiario.fecha <= fecha_fin
    )
    
    if sede_id:
        query = query.filter(CierreDiario.sede_id == sede_id)
    
    resultados = query.order_by(CierreDiario.fecha.desc()).all()
    
    response = []
    for r in resultados:
        sede = db.query(Sede).filter(Sede.id == r.sede_id).first()
        response.append(ReporteAuditoriaResponse(
            fecha=r.fecha,
            sede=sede.nombre if sede else "Desconocida",
            balance_sistema=float(r.balance_sistema),
            efectivo_reportado=float(r.efectivo_reportado),
            transferencia_reportada=float(r.transferencia_reportada),
            diferencia=float(r.diferencia),
            cerrado_por=r.cerrado_por or "Sistema"
        ))
    
    return response


@router.get("/dashboard")
def dashboard_data(
    sede_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Datos para el dashboard principal"""
    if current_user.rol == "vendedor":
        sede_id = current_user.sede_id
    
    fecha_actual = date.today()
    fecha_semana = fecha_actual - timedelta(days=7)
    
    # Ventas del día
    ventas_hoy_query = db.query(
        func.count(Venta.id).label("total_ventas"),
        func.sum(Venta.total).label("total_ingresos"),
        func.sum(func.if_(Venta.metodo_pago == MetodoPago.efectivo, Venta.total, 0)).label("efectivo"),
        func.sum(func.if_(Venta.metodo_pago == MetodoPago.transferencia, Venta.total, 0)).label("transferencia")
    ).filter(
        cast(Venta.created_at, Date) == fecha_actual,
        Venta.anulada == False
    )
    
    if sede_id:
        ventas_hoy_query = ventas_hoy_query.filter(Venta.sede_id == sede_id)
    
    ventas_hoy = ventas_hoy_query.first()
    
    # Ventas de la semana
    ventas_semana_query = db.query(
        func.count(Venta.id).label("total_ventas"),
        func.sum(Venta.total).label("total_ingresos")
    ).filter(
        cast(Venta.created_at, Date) >= fecha_semana,
        cast(Venta.created_at, Date) <= fecha_actual,
        Venta.anulada == False
    )
    
    if sede_id:
        ventas_semana_query = ventas_semana_query.filter(Venta.sede_id == sede_id)
    
    ventas_semana = ventas_semana_query.first()
    
    # Último cierre
    query_cierre = db.query(CierreDiario)
    if sede_id:
        query_cierre = query_cierre.filter(CierreDiario.sede_id == sede_id)
    ultimo_cierre = query_cierre.order_by(CierreDiario.fecha.desc()).first()
    
    # Productos con stock bajo
    from app.routers.inventario import stock_actual
    # Llamada a la función stock_actual (necesita ser importada correctamente)
    try:
        # Intentamos obtener stock actual
        stock_result = stock_actual(sede_id=sede_id, db=db, current_user=current_user)
        alertas = [item for item in stock_result if item.alerta] if stock_result else []
    except:
        alertas = []
    
    return {
        "ventas_hoy": {
            "total_ventas": ventas_hoy.total_ventas or 0,
            "total_ingresos": float(ventas_hoy.total_ingresos or 0),
            "efectivo": float(ventas_hoy.efectivo or 0),
            "transferencia": float(ventas_hoy.transferencia or 0),
            "ticket_promedio": float((ventas_hoy.total_ingresos or 0) / (ventas_hoy.total_ventas or 1))
        },
        "ventas_semana": {
            "total_ventas": ventas_semana.total_ventas or 0,
            "total_ingresos": float(ventas_semana.total_ingresos or 0)
        },
        "ultimo_cierre": {
            "fecha": ultimo_cierre.fecha if ultimo_cierre else None,
            "diferencia": float(ultimo_cierre.diferencia) if ultimo_cierre else 0
        },
        "alertas_stock": 0  # Temporal hasta corregir import
    }