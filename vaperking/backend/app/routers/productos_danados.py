from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from app.database import get_db
from app.dependencies import require_roles
from app.models.usuario import Usuario
from app.models.producto_danado import ProductoDanado
from app.models.sede import Sede
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class ProductoDanadoCreate(BaseModel):
    fecha: date
    nombre_producto: str
    cantidad: int
    motivo: Optional[str] = None


class ProductoDanadoUpdate(BaseModel):
    fecha: Optional[date] = None
    nombre_producto: Optional[str] = None
    cantidad: Optional[int] = None
    motivo: Optional[str] = None


class ProductoDanadoResponse(BaseModel):
    id: int
    sede_id: int
    sede_nombre: Optional[str] = None
    usuario_id: int
    nombre_usuario: Optional[str] = None
    fecha: date
    nombre_producto: str
    cantidad: int
    motivo: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ProductoDanadoResponse])
def listar_productos_danados(
    sede_id: Optional[int] = Query(None),
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Lista productos dañados con filtros"""
    query = db.query(ProductoDanado)
    
    if current_user.rol == "vendedor":
        query = query.filter(ProductoDanado.sede_id == current_user.sede_id)
    elif sede_id:
        query = query.filter(ProductoDanado.sede_id == sede_id)
    
    if fecha_inicio:
        query = query.filter(ProductoDanado.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.filter(ProductoDanado.fecha <= fecha_fin)
    
    registros = query.order_by(ProductoDanado.fecha.desc()).all()
    
    result = []
    for reg in registros:
        # Obtener nombre de la sede
        sede = db.query(Sede).filter(Sede.id == reg.sede_id).first()
        sede_nombre = sede.nombre if sede else "Desconocida"
        
        # Obtener nombre del usuario
        usuario = db.query(Usuario).filter(Usuario.id == reg.usuario_id).first()
        nombre_usuario = usuario.nombre_completo if usuario else "Desconocido"
        
        result.append(ProductoDanadoResponse(
            id=reg.id,
            sede_id=reg.sede_id,
            sede_nombre=sede_nombre,
            usuario_id=reg.usuario_id,
            nombre_usuario=nombre_usuario,
            fecha=reg.fecha,
            nombre_producto=reg.nombre_producto,
            cantidad=reg.cantidad,
            motivo=reg.motivo,
            created_at=reg.created_at,
            updated_at=reg.updated_at
        ))
    
    return result


@router.post("/", response_model=ProductoDanadoResponse)
def crear_producto_danado(
    data: ProductoDanadoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Registra un producto dañado"""
    # Si es vendedor, usa su sede; si es admin, usa sede_id del body o la primera
    sede_id = current_user.sede_id if current_user.rol == "vendedor" else 1
    
    nuevo = ProductoDanado(
        sede_id=sede_id,
        usuario_id=current_user.id,
        fecha=data.fecha,
        nombre_producto=data.nombre_producto,
        cantidad=data.cantidad,
        motivo=data.motivo
    )
    
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    
    # Obtener nombres para la respuesta
    sede = db.query(Sede).filter(Sede.id == nuevo.sede_id).first()
    sede_nombre = sede.nombre if sede else "Desconocida"
    
    return ProductoDanadoResponse(
        id=nuevo.id,
        sede_id=nuevo.sede_id,
        sede_nombre=sede_nombre,
        usuario_id=nuevo.usuario_id,
        nombre_usuario=current_user.nombre_completo,
        fecha=nuevo.fecha,
        nombre_producto=nuevo.nombre_producto,
        cantidad=nuevo.cantidad,
        motivo=nuevo.motivo,
        created_at=nuevo.created_at,
        updated_at=nuevo.updated_at
    )


@router.put("/{registro_id}", response_model=ProductoDanadoResponse)
def actualizar_producto_danado(
    registro_id: int,
    data: ProductoDanadoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Actualiza un registro de producto dañado"""
    registro = db.query(ProductoDanado).filter(ProductoDanado.id == registro_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    # Vendedor solo puede editar sus propios registros
    if current_user.rol == "vendedor" and registro.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes editar tus propios registros")
    
    if data.fecha is not None:
        registro.fecha = data.fecha
    if data.nombre_producto is not None:
        registro.nombre_producto = data.nombre_producto
    if data.cantidad is not None:
        registro.cantidad = data.cantidad
    if data.motivo is not None:
        registro.motivo = data.motivo
    
    db.commit()
    db.refresh(registro)
    
    # Obtener nombres para la respuesta
    sede = db.query(Sede).filter(Sede.id == registro.sede_id).first()
    sede_nombre = sede.nombre if sede else "Desconocida"
    usuario = db.query(Usuario).filter(Usuario.id == registro.usuario_id).first()
    nombre_usuario = usuario.nombre_completo if usuario else "Desconocido"
    
    return ProductoDanadoResponse(
        id=registro.id,
        sede_id=registro.sede_id,
        sede_nombre=sede_nombre,
        usuario_id=registro.usuario_id,
        nombre_usuario=nombre_usuario,
        fecha=registro.fecha,
        nombre_producto=registro.nombre_producto,
        cantidad=registro.cantidad,
        motivo=registro.motivo,
        created_at=registro.created_at,
        updated_at=registro.updated_at
    )


@router.delete("/{registro_id}")
def eliminar_producto_danado(
    registro_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Elimina un registro (solo admin)"""
    registro = db.query(ProductoDanado).filter(ProductoDanado.id == registro_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    db.delete(registro)
    db.commit()
    
    return {"message": "Registro eliminado correctamente"}