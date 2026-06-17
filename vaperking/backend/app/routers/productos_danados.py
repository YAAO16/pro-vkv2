from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app.dependencies import get_current_user
from app.models import ProductoDanado, Sede, Usuario
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class CrearDanadoRequest(BaseModel):
    sede_id: int
    fecha: date
    nombre_producto: str
    cantidad: int
    motivo: Optional[str] = None

@router.get("/")
def get_productos_danados(
    sede_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(ProductoDanado)
    if sede_id:
        query = query.filter(ProductoDanado.sede_id == sede_id)
    
    danados = query.order_by(ProductoDanado.fecha.desc()).all()
    return danados

@router.post("/")
def crear_producto_danado(
    request: CrearDanadoRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verificar sede
    sede = db.query(Sede).filter(Sede.id == request.sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    danado = ProductoDanado(
        sede_id=request.sede_id,
        usuario_id=current_user.id,
        fecha=request.fecha,
        nombre_producto=request.nombre_producto,
        cantidad=request.cantidad,
        motivo=request.motivo
    )
    
    db.add(danado)
    db.commit()
    db.refresh(danado)
    
    return danado

@router.delete("/{danado_id}")
def eliminar_producto_danado(
    danado_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    danado = db.query(ProductoDanado).filter(ProductoDanado.id == danado_id).first()
    if not danado:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    # Solo admin puede eliminar
    if current_user.rol.value != "admin":
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este registro")
    
    db.delete(danado)
    db.commit()
    
    return {"message": "Registro eliminado correctamente"}