from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.database import get_db
from app.dependencies import get_current_user, verify_admin
from app.models import Usuario, Permiso
from app.core.security import get_password_hash

router = APIRouter()

class AsignarPermisosRequest(BaseModel):
    permisos_ids: List[int]

class CrearUsuarioRequest(BaseModel):
    username: str
    nombre_completo: str
    password: str
    rol: str
    sede_id: int = None

class EditarUsuarioRequest(BaseModel):
    nombre_completo: str = None
    rol: str = None
    sede_id: int = None
    activo: bool = None
    password: str = None

@router.get("/")
def get_usuarios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    usuarios = db.query(Usuario).all()
    return usuarios

@router.get("/{usuario_id}")
def get_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario

@router.post("/")
def crear_usuario(
    request: CrearUsuarioRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    # Verificar si el username ya existe
    existing = db.query(Usuario).filter(Usuario.username == request.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    
    nuevo_usuario = Usuario(
        username=request.username,
        nombre_completo=request.nombre_completo,
        password_hash=get_password_hash(request.password),
        rol=request.rol,
        sede_id=request.sede_id,
        activo=True
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    
    return nuevo_usuario

@router.put("/{usuario_id}")
def editar_usuario(
    usuario_id: int,
    request: EditarUsuarioRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if request.nombre_completo is not None:
        usuario.nombre_completo = request.nombre_completo
    if request.rol is not None:
        usuario.rol = request.rol
    if request.sede_id is not None:
        usuario.sede_id = request.sede_id
    if request.activo is not None:
        usuario.activo = request.activo
    if request.password:
        usuario.password_hash = get_password_hash(request.password)
    
    db.commit()
    db.refresh(usuario)
    
    return usuario

@router.delete("/{usuario_id}")
def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Desactivar en lugar de eliminar
    usuario.activo = False
    db.commit()
    
    return {"message": "Usuario desactivado correctamente"}

@router.get("/{usuario_id}/permisos")
def get_usuario_permisos(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario.permisos

@router.post("/{usuario_id}/permisos")
def asignar_permisos(
    usuario_id: int,
    request: AsignarPermisosRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    permisos = db.query(Permiso).filter(Permiso.id.in_(request.permisos_ids)).all()
    usuario.permisos = permisos
    db.commit()
    
    return {"message": "Permisos asignados correctamente"}