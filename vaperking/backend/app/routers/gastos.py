from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from app.database import get_db
from app.dependencies import get_current_user, verify_admin
from app.models import Gasto, Sede, Usuario
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class CrearGastoRequest(BaseModel):
    fecha: date
    motivo: str
    valor: float
    descripcion: Optional[str] = None
    sede_id: int
    usuario_id: int

class EditarGastoRequest(BaseModel):
    fecha: Optional[date] = None
    motivo: Optional[str] = None
    valor: Optional[float] = None
    descripcion: Optional[str] = None

@router.get("/")
def get_gastos(
    sede_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Gasto)
    if sede_id:
        query = query.filter(Gasto.sede_id == sede_id)
    
    gastos = query.order_by(Gasto.fecha.desc()).all()
    return gastos

@router.get("/resumen")
def get_resumen_gastos(
    sede_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(
        func.sum(Gasto.valor).label("total_gastos"),
        func.count(Gasto.id).label("total_registros"),
        func.sum(func.if_(Gasto.fecha == date.today(), Gasto.valor, 0)).label("gastos_hoy")
    )
    if sede_id:
        query = query.filter(Gasto.sede_id == sede_id)
    
    resultado = query.first()
    
    return {
        "total_gastos": resultado.total_gastos or 0,
        "total_registros": resultado.total_registros or 0,
        "gastos_hoy": resultado.gastos_hoy or 0
    }

@router.post("/")
def crear_gasto(
    request: CrearGastoRequest,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    # Verificar sede
    sede = db.query(Sede).filter(Sede.id == request.sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    # Verificar usuario
    usuario = db.query(Usuario).filter(Usuario.id == request.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    gasto = Gasto(
        fecha=request.fecha,
        motivo=request.motivo,
        valor=request.valor,
        descripcion=request.descripcion,
        sede_id=request.sede_id,
        usuario_id=request.usuario_id
    )
    
    db.add(gasto)
    db.commit()
    db.refresh(gasto)
    
    return gasto

@router.put("/{gasto_id}")
def editar_gasto(
    gasto_id: int,
    request: EditarGastoRequest,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    gasto = db.query(Gasto).filter(Gasto.id == gasto_id).first()
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    if request.fecha is not None:
        gasto.fecha = request.fecha
    if request.motivo is not None:
        gasto.motivo = request.motivo
    if request.valor is not None:
        gasto.valor = request.valor
    if request.descripcion is not None:
        gasto.descripcion = request.descripcion
    
    db.commit()
    db.refresh(gasto)
    
    return gasto

@router.delete("/{gasto_id}")
def eliminar_gasto(
    gasto_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    gasto = db.query(Gasto).filter(Gasto.id == gasto_id).first()
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    db.delete(gasto)
    db.commit()
    
    return {"message": "Gasto eliminado correctamente"}