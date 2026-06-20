from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.database import get_db
from app.dependencies import get_current_user, verify_admin
from app.models import Usuario, Permiso
from app.core.security import get_password_hash
from app.decorators import audit  # ← NUEVO

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
@audit(accion="crear_usuario", tabla="usuarios")  # ← DECORADOR
def crear_usuario(
    request: Request,  # ← NUEVO
    request_data: CrearUsuarioRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    existing = db.query(Usuario).filter(Usuario.username == request_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")

    nuevo_usuario = Usuario(
        username=request_data.username,
        nombre_completo=request_data.nombre_completo,
        password_hash=get_password_hash(request_data.password),
        rol=request_data.rol,
        sede_id=request_data.sede_id,
        activo=True
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return nuevo_usuario

@router.put("/{usuario_id}")
@audit(accion="editar_usuario", tabla="usuarios")  # ← DECORADOR
def editar_usuario(
    request: Request,  # ← NUEVO
    usuario_id: int,
    request_data: EditarUsuarioRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if request_data.nombre_completo is not None:
        usuario.nombre_completo = request_data.nombre_completo
    if request_data.rol is not None:
        usuario.rol = request_data.rol
    if request_data.sede_id is not None:
        usuario.sede_id = request_data.sede_id
    if request_data.activo is not None:
        usuario.activo = request_data.activo
    if request_data.password:
        usuario.password_hash = get_password_hash(request_data.password)

    db.commit()
    db.refresh(usuario)

    return usuario

@router.delete("/{usuario_id}")
@audit(accion="desactivar_usuario", tabla="usuarios")  # ← DECORADOR
def eliminar_usuario(
    request: Request,  # ← NUEVO
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    usuario.activo = False
    db.commit()

    return {"message": "Usuario desactivado correctamente"}

@router.get("/{usuario_id}/permisos")
def get_usuario_permisos(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.id != usuario_id and current_user.rol.value != "admin":
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para ver los permisos de este usuario"
        )

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return usuario.permisos

@router.post("/{usuario_id}/permisos")
@audit(accion="asignar_permisos", tabla="usuario_permisos")  # ← DECORADOR
def asignar_permisos(
    request: Request,  # ← NUEVO
    usuario_id: int,
    request_data: AsignarPermisosRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    permisos = db.query(Permiso).filter(Permiso.id.in_(request_data.permisos_ids)).all()
    usuario.permisos = permisos
    db.commit()

    return {"message": "Permisos asignados correctamente"}