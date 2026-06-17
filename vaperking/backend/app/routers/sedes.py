from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, verify_admin
from app.models import Sede
from pydantic import BaseModel

router = APIRouter()

class CrearSedeRequest(BaseModel):
    nombre: str
    ciudad: str
    direccion: str = None
    telefono: str = None

class EditarSedeRequest(BaseModel):
    nombre: str = None
    ciudad: str = None
    direccion: str = None
    telefono: str = None
    activo: bool = None

@router.get("/")
def get_sedes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    sedes = db.query(Sede).filter(Sede.activo == True).all()
    return {"sedes": sedes}

@router.get("/{sede_id}")
def get_sede(
    sede_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    sede = db.query(Sede).filter(Sede.id == sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    return {"sede": sede}

@router.post("/")
def crear_sede(
    request: CrearSedeRequest,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    nueva_sede = Sede(
        nombre=request.nombre,
        ciudad=request.ciudad,
        direccion=request.direccion,
        telefono=request.telefono
    )
    db.add(nueva_sede)
    db.commit()
    db.refresh(nueva_sede)
    return nueva_sede

@router.put("/{sede_id}")
def editar_sede(
    sede_id: int,
    request: EditarSedeRequest,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    sede = db.query(Sede).filter(Sede.id == sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    if request.nombre is not None:
        sede.nombre = request.nombre
    if request.ciudad is not None:
        sede.ciudad = request.ciudad
    if request.direccion is not None:
        sede.direccion = request.direccion
    if request.telefono is not None:
        sede.telefono = request.telefono
    if request.activo is not None:
        sede.activo = request.activo
    
    db.commit()
    db.refresh(sede)
    return sede

@router.delete("/{sede_id}")
def eliminar_sede(
    sede_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    sede = db.query(Sede).filter(Sede.id == sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    sede.activo = False
    db.commit()
    return {"message": "Sede desactivada correctamente"}