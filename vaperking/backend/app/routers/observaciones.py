from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.dependencies import require_roles
from app.models.usuario import Usuario
from app.models.observacion import Observacion
from app.models.sede import Sede
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class ObservacionCreate(BaseModel):
    observacion: str


class ObservacionUpdate(BaseModel):
    observacion: Optional[str] = None


class ObservacionResponse(BaseModel):
    id: int
    sede_id: int
    sede_nombre: Optional[str] = None
    usuario_id: int
    nombre_usuario: Optional[str] = None
    observacion: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ObservacionResponse])
def listar_observaciones(
    sede_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Lista observaciones con filtro por sede"""
    query = db.query(Observacion)
    
    if current_user.rol == "vendedor":
        query = query.filter(Observacion.sede_id == current_user.sede_id)
    elif sede_id:
        query = query.filter(Observacion.sede_id == sede_id)
    
    observaciones = query.order_by(Observacion.created_at.desc()).all()
    
    result = []
    for obs in observaciones:
        # Obtener nombre de la sede
        sede = db.query(Sede).filter(Sede.id == obs.sede_id).first()
        sede_nombre = sede.nombre if sede else "Desconocida"
        
        # Obtener nombre del usuario
        usuario = db.query(Usuario).filter(Usuario.id == obs.usuario_id).first()
        nombre_usuario = usuario.nombre_completo if usuario else "Desconocido"
        
        result.append(ObservacionResponse(
            id=obs.id,
            sede_id=obs.sede_id,
            sede_nombre=sede_nombre,
            usuario_id=obs.usuario_id,
            nombre_usuario=nombre_usuario,
            observacion=obs.observacion,
            created_at=obs.created_at,
            updated_at=obs.updated_at
        ))
    
    return result


@router.post("/", response_model=ObservacionResponse)
def crear_observacion(
    data: ObservacionCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Crea una nueva observación"""
    # Si es vendedor, usa su sede; si es admin, usa sede_id del body o la primera
    sede_id = current_user.sede_id if current_user.rol == "vendedor" else 1
    
    nueva = Observacion(
        sede_id=sede_id,
        usuario_id=current_user.id,
        observacion=data.observacion
    )
    
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    
    # Obtener nombres para la respuesta
    sede = db.query(Sede).filter(Sede.id == nueva.sede_id).first()
    sede_nombre = sede.nombre if sede else "Desconocida"
    
    return ObservacionResponse(
        id=nueva.id,
        sede_id=nueva.sede_id,
        sede_nombre=sede_nombre,
        usuario_id=nueva.usuario_id,
        nombre_usuario=current_user.nombre_completo,
        observacion=nueva.observacion,
        created_at=nueva.created_at,
        updated_at=nueva.updated_at
    )


@router.put("/{observacion_id}", response_model=ObservacionResponse)
def actualizar_observacion(
    observacion_id: int,
    data: ObservacionUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Actualiza una observación"""
    obs = db.query(Observacion).filter(Observacion.id == observacion_id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observación no encontrada")
    
    # Vendedor solo puede editar sus propias observaciones
    if current_user.rol == "vendedor" and obs.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes editar tus propias observaciones")
    
    if data.observacion is not None:
        obs.observacion = data.observacion
    
    db.commit()
    db.refresh(obs)
    
    # Obtener nombres para la respuesta
    sede = db.query(Sede).filter(Sede.id == obs.sede_id).first()
    sede_nombre = sede.nombre if sede else "Desconocida"
    usuario = db.query(Usuario).filter(Usuario.id == obs.usuario_id).first()
    nombre_usuario = usuario.nombre_completo if usuario else "Desconocido"
    
    return ObservacionResponse(
        id=obs.id,
        sede_id=obs.sede_id,
        sede_nombre=sede_nombre,
        usuario_id=obs.usuario_id,
        nombre_usuario=nombre_usuario,
        observacion=obs.observacion,
        created_at=obs.created_at,
        updated_at=obs.updated_at
    )


@router.delete("/{observacion_id}")
def eliminar_observacion(
    observacion_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Elimina una observación (solo admin)"""
    obs = db.query(Observacion).filter(Observacion.id == observacion_id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observación no encontrada")
    
    db.delete(obs)
    db.commit()
    
    return {"message": "Observación eliminada correctamente"}