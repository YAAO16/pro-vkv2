from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Observacion, Sede, Usuario
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class CrearObservacionRequest(BaseModel):
    sede_id: int
    observacion: str

class EditarObservacionRequest(BaseModel):
    observacion: str

@router.get("/")
def get_observaciones(
    sede_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Observacion)
    if sede_id:
        query = query.filter(Observacion.sede_id == sede_id)
    
    observaciones = query.order_by(Observacion.created_at.desc()).all()
    return observaciones

@router.post("/")
def crear_observacion(
    request: CrearObservacionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verificar sede
    sede = db.query(Sede).filter(Sede.id == request.sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    observacion = Observacion(
        sede_id=request.sede_id,
        usuario_id=current_user.id,
        observacion=request.observacion
    )
    
    db.add(observacion)
    db.commit()
    db.refresh(observacion)
    
    return observacion

@router.put("/{observacion_id}")
def editar_observacion(
    observacion_id: int,
    request: EditarObservacionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    observacion = db.query(Observacion).filter(Observacion.id == observacion_id).first()
    if not observacion:
        raise HTTPException(status_code=404, detail="Observación no encontrada")
    
    # Solo el creador puede editar
    if observacion.usuario_id != current_user.id and current_user.rol.value != "admin":
        raise HTTPException(status_code=403, detail="No tienes permiso para editar esta observación")
    
    observacion.observacion = request.observacion
    db.commit()
    db.refresh(observacion)
    
    return observacion

@router.delete("/{observacion_id}")
def eliminar_observacion(
    observacion_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    observacion = db.query(Observacion).filter(Observacion.id == observacion_id).first()
    if not observacion:
        raise HTTPException(status_code=404, detail="Observación no encontrada")
    
    # Solo el creador o admin puede eliminar
    if observacion.usuario_id != current_user.id and current_user.rol.value != "admin":
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta observación")
    
    db.delete(observacion)
    db.commit()
    
    return {"message": "Observación eliminada correctamente"}