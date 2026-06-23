from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, date
from typing import Optional
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Venta, VentaDetalle, Producto, Gasto, CierreDiario, Sede

router = APIRouter()

@router.get("/dashboard")
def dashboard_data(
    sede_id: int = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        hoy = date.today()
        inicio_semana = hoy - timedelta(days=hoy.weekday())

        query_ventas_hoy = db.query(Venta).filter(
            func.date(Venta.created_at) == hoy,
            Venta.anulada == False
        )
        if sede_id:
            query_ventas_hoy = query_ventas_hoy.filter(Venta.sede_id == sede_id)

        ventas_hoy = query_ventas_hoy.all()
        total_ventas_hoy = len(ventas_hoy)
        total_ingresos_hoy = sum(v.total for v in ventas_hoy)
        efectivo_hoy = sum(v.efectivo or 0 for v in ventas_hoy if v.metodo_pago in ['efectivo', 'mixto'])
        transferencia_hoy = sum(v.transferencia or 0 for v in ventas_hoy if v.metodo_pago in ['transferencia', 'mixto'])
        ticket_promedio = total_ingresos_hoy / total_ventas_hoy if total_ventas_hoy > 0 else 0

        query_ventas_semana = db.query(Venta).filter(
            func.date(Venta.created_at) >= inicio_semana,
            Venta.anulada == False
        )
        if sede_id:
            query_ventas_semana = query_ventas_semana.filter(Venta.sede_id == sede_id)
        ventas_semana = query_ventas_semana.all()
        total_ventas_semana = len(ventas_semana)
        total_ingresos_semana = sum(v.total for v in ventas_semana)

        alertas_stock = db.query(Producto).filter(
            Producto.stock_minimo > 0,
            Producto.activo == True
        ).count()

        query_cierre = db.query(CierreDiario).order_by(CierreDiario.fecha.desc())
        if sede_id:
            query_cierre = query_cierre.filter(CierreDiario.sede_id == sede_id)
        ultimo_cierre = query_cierre.first()

        return {
            "ventas_hoy": {
                "total_ventas": total_ventas_hoy,
                "total_ingresos": total_ingresos_hoy,
                "efectivo": efectivo_hoy,
                "transferencia": transferencia_hoy,
                "ticket_promedio": ticket_promedio
            },
            "ventas_semana": {
                "total_ventas": total_ventas_semana,
                "total_ingresos": total_ingresos_semana
            },
            "alertas_stock": alertas_stock,
            "ultimo_cierre": {
                "fecha": ultimo_cierre.fecha.isoformat() if ultimo_cierre else None,
                "diferencia": ultimo_cierre.diferencia if ultimo_cierre else 0
            }
        }
    except Exception as e:
        print(f"Error en dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/resumen")
def resumen_reportes(
    sede_id: int = None,
    semana: bool = False,
    mes: bool = False,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        hoy = date.today()
        if semana:
            inicio = hoy - timedelta(days=7)
            fin = hoy
        elif mes:
            inicio = hoy - timedelta(days=30)
            fin = hoy
        elif fecha_inicio and fecha_fin:
            inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
            fin = datetime.strptime(fecha_fin, "%Y-%m-%d").date()
        else:
            inicio = hoy
            fin = hoy

        query_ventas = db.query(Venta).filter(
            func.date(Venta.created_at) >= inicio,
            func.date(Venta.created_at) <= fin,
            Venta.anulada == False
        )
        if sede_id:
            query_ventas = query_ventas.filter(Venta.sede_id == sede_id)

        ventas = query_ventas.all()
        total_ventas = len(ventas)
        total_ingresos = sum(v.total for v in ventas)
        efectivo = sum(v.efectivo or 0 for v in ventas if v.metodo_pago in ['efectivo', 'mixto'])
        transferencia = sum(v.transferencia or 0 for v in ventas if v.metodo_pago in ['transferencia', 'mixto'])

        query_gastos = db.query(Gasto).filter(
            Gasto.fecha >= inicio,
            Gasto.fecha <= fin
        )
        if sede_id:
            query_gastos = query_gastos.filter(Gasto.sede_id == sede_id)
        total_gastos = sum(g.valor for g in query_gastos.all())

        query_top = db.query(
            Producto.id,
            Producto.nombre,
            Producto.sku,
            func.sum(VentaDetalle.cantidad).label("total_vendido"),
            func.sum(VentaDetalle.subtotal).label("total_ingresos")
        ).join(VentaDetalle, VentaDetalle.producto_id == Producto.id)\
         .join(Venta, Venta.id == VentaDetalle.venta_id)\
         .filter(
             func.date(Venta.created_at) >= inicio,
             func.date(Venta.created_at) <= fin,
             Venta.anulada == False
         )
        if sede_id:
            query_top = query_top.filter(Venta.sede_id == sede_id)
        productos_top = query_top.group_by(Producto.id).order_by(func.sum(VentaDetalle.cantidad).desc()).limit(10).all()

        return {
            "ventas_hoy": {
                "total_ventas": total_ventas,
                "total_ingresos": total_ingresos,
                "efectivo": efectivo,
                "transferencia": transferencia
            },
            "ventas_semana": {
                "total_ventas": total_ventas,
                "total_ingresos": total_ingresos
            } if semana else None,
            "ventas_mes": {
                "total_ventas": total_ventas,
                "total_ingresos": total_ingresos
            } if mes else None,
            "productos_top": [
                {
                    "id": p.id,
                    "nombre": p.nombre,
                    "sku": p.sku,
                    "total_vendido": p.total_vendido or 0,
                    "total_ingresos": float(p.total_ingresos) if p.total_ingresos else 0
                }
                for p in productos_top
            ],
            "total_gastos": total_gastos
        }
    except Exception as e:
        print(f"Error en resumen: {e}")
        raise HTTPException(status_code=500, detail=str(e))