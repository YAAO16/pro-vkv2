from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.dependencies import require_roles
from app.models.usuario import Usuario  # Solo Usuario, no RolUsuario
from app.models.sede import Sede
from app.utils.security import hash_password
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# Schemas
class UsuarioCreate(BaseModel):
    username: str
    nombre_completo: str
    password: str
    rol: str  # "admin" o "vendedor"
    sede_id: Optional[int] = None


class UsuarioUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    password: Optional[str] = None
    rol: Optional[str] = None
    sede_id: Optional[int] = None
    activo: Optional[bool] = None


class UsuarioResponse(BaseModel):
    id: int
    username: str
    nombre_completo: str
    rol: str
    sede_id: Optional[int]
    nombre_sede: Optional[str]
    activo: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=list[UsuarioResponse])
def listar_usuarios(
    rol: Optional[str] = Query(None),
    activo: Optional[bool] = Query(True),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Lista todos los usuarios (solo admin)"""
    query = db.query(Usuario)
    
    if rol:
        query = query.filter(Usuario.rol == rol)
    if activo is not None:
        query = query.filter(Usuario.activo == activo)
    
    usuarios = query.order_by(Usuario.created_at.desc()).all()
    
    response = []
    for u in usuarios:
        sede = db.query(Sede).filter(Sede.id == u.sede_id).first()
        response.append(UsuarioResponse(
            id=u.id,
            username=u.username,
            nombre_completo=u.nombre_completo,
            rol=u.rol,
            sede_id=u.sede_id,
            nombre_sede=sede.nombre if sede else None,
            activo=u.activo,
            created_at=u.created_at
        ))
    
    return response


@router.get("/{usuario_id}", response_model=UsuarioResponse)
def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Obtiene un usuario por ID (solo admin)"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    sede = db.query(Sede).filter(Sede.id == usuario.sede_id).first()
    
    return UsuarioResponse(
        id=usuario.id,
        username=usuario.username,
        nombre_completo=usuario.nombre_completo,
        rol=usuario.rol.value,
        sede_id=usuario.sede_id,
        nombre_sede=sede.nombre if sede else None,
        activo=usuario.activo,
        created_at=usuario.created_at
    )


@router.post("/", response_model=UsuarioResponse)
def crear_usuario(
    usuario_data: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Crea un nuevo usuario (solo admin)"""
    # Verificar si ya existe el username
    existe = db.query(Usuario).filter(Usuario.username == usuario_data.username).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un usuario con este username")
    
    # Verificar que el rol sea válido
    if usuario_data.rol not in ["admin", "vendedor"]:
        raise HTTPException(status_code=400, detail="Rol inválido. Debe ser 'admin' o 'vendedor'")
    
    # Si es vendedor, verificar que tenga sede asignada
    if usuario_data.rol == "vendedor" and not usuario_data.sede_id:
        raise HTTPException(status_code=400, detail="Un vendedor debe tener una sede asignada")
    
    # Verificar que la sede exista
    if usuario_data.sede_id:
        sede = db.query(Sede).filter(Sede.id == usuario_data.sede_id).first()
        if not sede:
            raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    nuevo_usuario = Usuario(
        username=usuario_data.username,
        nombre_completo=usuario_data.nombre_completo,
        password_hash=hash_password(usuario_data.password),
        rol=usuario_data.rol,
        sede_id=usuario_data.sede_id
    )
    
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    
    sede = db.query(Sede).filter(Sede.id == nuevo_usuario.sede_id).first()
    
    return UsuarioResponse(
        id=nuevo_usuario.id,
        username=nuevo_usuario.username,
        nombre_completo=nuevo_usuario.nombre_completo,
        rol=nuevo_usuario.rol,
        sede_id=nuevo_usuario.sede_id,
        nombre_sede=sede.nombre if sede else None,
        activo=nuevo_usuario.activo,
        created_at=nuevo_usuario.created_at
    )


@router.put("/{usuario_id}", response_model=UsuarioResponse)
def actualizar_usuario(
    usuario_id: int,
    usuario_data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Actualiza un usuario (solo admin)"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Actualizar campos
    if usuario_data.nombre_completo is not None:
        usuario.nombre_completo = usuario_data.nombre_completo
    if usuario_data.password:
        usuario.password_hash = hash_password(usuario_data.password)
    if usuario_data.rol is not None:
        if usuario_data.rol not in ["admin", "vendedor"]:
            raise HTTPException(status_code=400, detail="Rol inválido")
        usuario.rol = usuario_data.rol
    if usuario_data.sede_id is not None:
        if usuario_data.sede_id:
            sede = db.query(Sede).filter(Sede.id == usuario_data.sede_id).first()
            if not sede:
                raise HTTPException(status_code=404, detail="Sede no encontrada")
        usuario.sede_id = usuario_data.sede_id
    if usuario_data.activo is not None:
        usuario.activo = usuario_data.activo
    
    db.commit()
    db.refresh(usuario)
    
    sede = db.query(Sede).filter(Sede.id == usuario.sede_id).first()
    
    return UsuarioResponse(
        id=usuario.id,
        username=usuario.username,
        nombre_completo=usuario.nombre_completo,
        rol=usuario.rol,
        sede_id=usuario.sede_id,
        nombre_sede=sede.nombre if sede else None,
        activo=usuario.activo,
        created_at=usuario.created_at
    )


@router.delete("/{usuario_id}")
def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Elimina (desactiva) un usuario (solo admin)"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # No permitir eliminar el propio usuario
    if usuario.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propio usuario")
    
    usuario.activo = False
    db.commit()
    
    return {"message": "Usuario desactivado correctamente"}