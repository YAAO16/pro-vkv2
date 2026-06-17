from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta, date
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Venta, VentaDetalle, Producto, Usuario, Sede
from app.models import InventarioDiario, CierreDiario, Gasto

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
        
        # Ventas de hoy
        query_ventas_hoy = db.query(Venta).filter(
            func.date(Venta.created_at) == hoy,
            Venta.anulada == False
        )
        if sede_id:
            query_ventas_hoy = query_ventas_hoy.filter(Venta.sede_id == sede_id)
        
        ventas_hoy = query_ventas_hoy.all()
        total_ventas_hoy = len(ventas_hoy)
        total_ingresos_hoy = sum(v.total for v in ventas_hoy)
        efectivo_hoy = sum(v.efectivo or 0 for v in ventas_hoy if v.metodo_pago.value in ['efectivo', 'mixto'])
        transferencia_hoy = sum(v.transferencia or 0 for v in ventas_hoy if v.metodo_pago.value in ['transferencia', 'mixto'])
        ticket_promedio = total_ingresos_hoy / total_ventas_hoy if total_ventas_hoy > 0 else 0
        
        # Ventas de la semana
        query_ventas_semana = db.query(Venta).filter(
            func.date(Venta.created_at) >= inicio_semana,
            Venta.anulada == False
        )
        if sede_id:
            query_ventas_semana = query_ventas_semana.filter(Venta.sede_id == sede_id)
        
        ventas_semana = query_ventas_semana.all()
        total_ventas_semana = len(ventas_semana)
        total_ingresos_semana = sum(v.total for v in ventas_semana)
        
        # Alertas de stock (productos con stock bajo)
        alertas_stock = db.query(Producto).filter(
            Producto.stock_minimo > 0,
            Producto.activo == True
        ).count()
        
        # Último cierre
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