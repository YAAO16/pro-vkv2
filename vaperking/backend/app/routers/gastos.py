from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import Optional, List
from app.database import get_db
from app.dependencies import require_roles
from app.models.gasto import Gasto
from app.models.sede import Sede
from app.models.usuario import Usuario
from pydantic import BaseModel

router = APIRouter(tags=["Gastos"])


class GastoCreate(BaseModel):
    fecha: date
    motivo: str
    valor: float
    descripcion: Optional[str] = None
    sede_id: int


@router.post("/gastos")
def create_gasto(
    gasto: GastoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Registra un nuevo gasto"""
    # Verificar sede
    sede = db.query(Sede).filter(Sede.id == gasto.sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    # Si es vendedor, verificar que la sede es la suya
    if current_user.rol == "vendedor" and current_user.sede_id != gasto.sede_id:
        raise HTTPException(status_code=403, detail="No puede crear gastos en otra sede")
    
    nuevo_gasto = Gasto(
        fecha=gasto.fecha,
        motivo=gasto.motivo,
        valor=gasto.valor,
        descripcion=gasto.descripcion,
        sede_id=gasto.sede_id,
        usuario_id=current_user.id
    )
    
    db.add(nuevo_gasto)
    db.commit()
    db.refresh(nuevo_gasto)
    
    return {"message": "Gasto registrado exitosamente", "gasto_id": nuevo_gasto.id}


@router.get("/gastos")
def get_gastos(
    sede_id: Optional[int] = Query(None),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Obtiene la lista de gastos"""
    query = db.query(Gasto)
    
    if current_user.rol == "vendedor" and current_user.sede_id:
        query = query.filter(Gasto.sede_id == current_user.sede_id)
    
    if sede_id:
        query = query.filter(Gasto.sede_id == sede_id)
    
    gastos = query.order_by(Gasto.fecha.desc(), Gasto.id.desc()).limit(limit).all()
    
    result = []
    for g in gastos:
        result.append({
            "id": g.id,
            "fecha": g.fecha,
            "motivo": g.motivo,
            "valor": g.valor,
            "descripcion": g.descripcion,
            "sede_id": g.sede_id,
            "usuario_id": g.usuario_id,
            "nombre_usuario": g.usuario.nombre_completo if g.usuario else "Unknown",
            "nombre_sede": g.sede.nombre if g.sede else "Sin sede",
            "created_at": g.created_at,
            "updated_at": g.updated_at
        })
    
    return result


@router.get("/gastos/resumen")
def get_resumen_gastos(
    sede_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Obtiene resumen de gastos"""
    hoy = date.today()
    inicio_semana = hoy - timedelta(days=hoy.weekday())
    inicio_mes = date(hoy.year, hoy.month, 1)
    
    query = db.query(Gasto)
    
    if current_user.rol == "vendedor" and current_user.sede_id:
        sede_id = current_user.sede_id
    
    if sede_id:
        query = query.filter(Gasto.sede_id == sede_id)
    
    total_hoy = query.filter(Gasto.fecha == hoy).with_entities(func.sum(Gasto.valor)).scalar() or 0
    total_semana = query.filter(Gasto.fecha >= inicio_semana).with_entities(func.sum(Gasto.valor)).scalar() or 0
    total_mes = query.filter(Gasto.fecha >= inicio_mes).with_entities(func.sum(Gasto.valor)).scalar() or 0
    
    ultimos_gastos = query.order_by(Gasto.fecha.desc(), Gasto.id.desc()).limit(10).all()
    
    ultimos = []
    for g in ultimos_gastos:
        ultimos.append({
            "id": g.id,
            "fecha": g.fecha,
            "motivo": g.motivo,
            "valor": g.valor,
            "descripcion": g.descripcion,
            "sede_id": g.sede_id,
            "nombre_sede": g.sede.nombre if g.sede else "Sin sede",
            "nombre_usuario": g.usuario.nombre_completo if g.usuario else "Unknown"
        })
    
    return {
        "total_gastos_hoy": total_hoy,
        "total_gastos_semana": total_semana,
        "total_gastos_mes": total_mes,
        "ultimos_gastos": ultimos
    }