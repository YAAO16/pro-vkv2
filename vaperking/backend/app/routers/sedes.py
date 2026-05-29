from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.dependencies import require_roles
from app.models.sede import Sede
from app.models.usuario import Usuario
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class SedeCreate(BaseModel):
    nombre: str
    ciudad: str
    direccion: Optional[str] = None
    telefono: Optional[str] = None


class SedeResponse(BaseModel):
    id: int
    nombre: str
    ciudad: str
    direccion: Optional[str]
    telefono: Optional[str]
    activo: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/")
def listar_sedes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Lista todas las sedes activas"""
    sedes = db.query(Sede).filter(Sede.activo == True).all()
    # Convertir a diccionario manualmente
    result = []
    for s in sedes:
        result.append({
            "id": s.id,
            "nombre": s.nombre,
            "ciudad": s.ciudad,
            "direccion": s.direccion,
            "telefono": s.telefono,
            "activo": s.activo,
            "created_at": s.created_at
        })
    return {"sedes": result}


@router.get("/{sede_id}")
def obtener_sede(
    sede_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Obtiene una sede por ID"""
    sede = db.query(Sede).filter(Sede.id == sede_id, Sede.activo == True).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    return {
        "sede": {
            "id": sede.id,
            "nombre": sede.nombre,
            "ciudad": sede.ciudad,
            "direccion": sede.direccion,
            "telefono": sede.telefono,
            "activo": sede.activo,
            "created_at": sede.created_at
        }
    }


@router.post("/")
def crear_sede(
    data: SedeCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Crea una nueva sede (solo admin)"""
    nueva_sede = Sede(
        nombre=data.nombre,
        ciudad=data.ciudad,
        direccion=data.direccion,
        telefono=data.telefono
    )
    
    db.add(nueva_sede)
    db.commit()
    db.refresh(nueva_sede)
    
    return {
        "message": "Sede creada correctamente",
        "sede": {
            "id": nueva_sede.id,
            "nombre": nueva_sede.nombre,
            "ciudad": nueva_sede.ciudad,
            "direccion": nueva_sede.direccion,
            "telefono": nueva_sede.telefono,
            "activo": nueva_sede.activo,
            "created_at": nueva_sede.created_at
        }
    }


@router.put("/{sede_id}")
def actualizar_sede(
    sede_id: int,
    data: SedeCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Actualiza una sede (solo admin)"""
    sede = db.query(Sede).filter(Sede.id == sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    sede.nombre = data.nombre
    sede.ciudad = data.ciudad
    sede.direccion = data.direccion
    sede.telefono = data.telefono
    
    db.commit()
    db.refresh(sede)
    
    return {
        "message": "Sede actualizada correctamente",
        "sede": {
            "id": sede.id,
            "nombre": sede.nombre,
            "ciudad": sede.ciudad,
            "direccion": sede.direccion,
            "telefono": sede.telefono,
            "activo": sede.activo,
            "created_at": sede.created_at
        }
    }


@router.delete("/{sede_id}")
def eliminar_sede(
    sede_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Elimina (desactiva) una sede (solo admin)"""
    sede = db.query(Sede).filter(Sede.id == sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    sede.activo = False
    db.commit()
    
    return {"message": "Sede desactivada correctamente"}