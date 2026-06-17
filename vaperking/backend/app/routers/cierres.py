from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from app.database import get_db
from app.dependencies import get_current_user, verify_admin
from app.models import CierreDiario, Sede, Usuario, Venta, Gasto
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class CrearCierreRequest(BaseModel):
    sede_id: int
    fecha: date
    efectivo_reportado: float
    transferencia_reportada: float
    observaciones: Optional[str] = None

@router.get("/")
def get_cierres(
    sede_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(CierreDiario)
    if sede_id:
        query = query.filter(CierreDiario.sede_id == sede_id)
    
    cierres = query.order_by(CierreDiario.fecha.desc()).all()
    return cierres

@router.get("/preview")
def preview_cierre(
    sede_id: int,
    fecha: date,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Calcular ventas del día
    ventas = db.query(Venta).filter(
        func.date(Venta.created_at) == fecha,
        Venta.sede_id == sede_id,
        Venta.anulada == False
    ).all()
    
    total_ventas = sum(v.total for v in ventas)
    efectivo = sum(v.efectivo or 0 for v in ventas if v.metodo_pago.value in ['efectivo', 'mixto'])
    transferencia = sum(v.transferencia or 0 for v in ventas if v.metodo_pago.value in ['transferencia', 'mixto'])
    
    # Calcular gastos del día
    gastos = db.query(Gasto).filter(
        Gasto.fecha == fecha,
        Gasto.sede_id == sede_id
    ).all()
    total_gastos = sum(g.valor for g in gastos)
    
    balance_sistema = total_ventas - total_gastos
    
    return {
        "fecha": fecha.isoformat(),
        "sede_id": sede_id,
        "balance_sistema": balance_sistema,
        "total_ventas": total_ventas,
        "efectivo": efectivo,
        "transferencia": transferencia,
        "total_gastos": total_gastos,
        "numero_ventas": len(ventas)
    }

@router.post("/")
def crear_cierre(
    request: CrearCierreRequest,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    # Verificar que no exista cierre para esa fecha
    existe = db.query(CierreDiario).filter(
        CierreDiario.sede_id == request.sede_id,
        CierreDiario.fecha == request.fecha
    ).first()
    
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un cierre para esta fecha")
    
    # Verificar sede
    sede = db.query(Sede).filter(Sede.id == request.sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    # Calcular balance del sistema
    ventas = db.query(Venta).filter(
        func.date(Venta.created_at) == request.fecha,
        Venta.sede_id == request.sede_id,
        Venta.anulada == False
    ).all()
    
    total_ventas = sum(v.total for v in ventas)
    
    gastos = db.query(Gasto).filter(
        Gasto.fecha == request.fecha,
        Gasto.sede_id == request.sede_id
    ).all()
    total_gastos = sum(g.valor for g in gastos)
    
    balance_sistema = total_ventas - total_gastos
    diferencia = balance_sistema - (request.efectivo_reportado + request.transferencia_reportada)
    
    cierre = CierreDiario(
        sede_id=request.sede_id,
        fecha=request.fecha,
        balance_sistema=balance_sistema,
        efectivo_reportado=request.efectivo_reportado,
        transferencia_reportada=request.transferencia_reportada,
        diferencia=diferencia,
        cerrado_por=current_user.id,
        observaciones=request.observaciones
    )
    
    db.add(cierre)
    db.commit()
    db.refresh(cierre)
    
    return cierre