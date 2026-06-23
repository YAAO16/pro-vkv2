from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from app.database import get_db
from app.dependencies import get_current_user, verify_admin
from app.models import CierreDiario, Sede, Usuario, Venta, Gasto
from app.decorators import audit
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
    ventas = db.query(Venta).filter(
        func.date(Venta.created_at) == fecha,
        Venta.sede_id == sede_id,
        Venta.anulada == False
    ).all()

    total_ventas = sum(v.total for v in ventas)
    efectivo = sum(v.efectivo or 0 for v in ventas if v.metodo_pago in ['efectivo', 'mixto'])
    transferencia = sum(v.transferencia or 0 for v in ventas if v.metodo_pago in ['transferencia', 'mixto'])

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
@audit(accion="crear_cierre", tabla="cierres_diarios")  # ← Auditoría
def crear_cierre(
    request: Request,
    data: CrearCierreRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    # Verificar si ya existe cierre para esa fecha
    existe = db.query(CierreDiario).filter(
        CierreDiario.sede_id == data.sede_id,
        CierreDiario.fecha == data.fecha
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un cierre para esta fecha")

    # Verificar sede
    sede = db.query(Sede).filter(Sede.id == data.sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    # Calcular balance del sistema
    ventas = db.query(Venta).filter(
        func.date(Venta.created_at) == data.fecha,
        Venta.sede_id == data.sede_id,
        Venta.anulada == False
    ).all()
    total_ventas = sum(v.total for v in ventas)

    gastos = db.query(Gasto).filter(
        Gasto.fecha == data.fecha,
        Gasto.sede_id == data.sede_id
    ).all()
    total_gastos = sum(g.valor for g in gastos)

    balance_sistema = total_ventas - total_gastos
    diferencia = balance_sistema - (data.efectivo_reportado + data.transferencia_reportada)

    # Crear cierre
    cierre = CierreDiario(
        sede_id=data.sede_id,
        fecha=data.fecha,
        balance_sistema=balance_sistema,
        efectivo_reportado=data.efectivo_reportado,
        transferencia_reportada=data.transferencia_reportada,
        diferencia=diferencia,
        cerrado_por=current_user.id,
        observaciones=data.observaciones
    )

    db.add(cierre)
    db.commit()
    db.refresh(cierre)

    return cierre