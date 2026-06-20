from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.dependencies import get_current_user, verify_admin
from app.models import Producto, Categoria
from pydantic import BaseModel
from app.decorators import audit  # ← NUEVO

router = APIRouter()

class CrearProductoRequest(BaseModel):
    sku: str
    nombre: str
    descripcion: Optional[str] = None
    categoria_id: Optional[int] = None
    precio_costo: float
    precio_venta: float
    stock_minimo: int = 5

class EditarProductoRequest(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    categoria_id: Optional[int] = None
    precio_costo: Optional[float] = None
    precio_venta: Optional[float] = None
    stock_minimo: Optional[int] = None
    activo: Optional[bool] = None

@router.get("/")
def get_productos(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    productos = db.query(Producto).filter(Producto.activo == True).all()
    return productos

@router.get("/categorias/")
def get_categorias(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    categorias = db.query(Categoria).all()
    return categorias

@router.post("/")
@audit(accion="crear_producto", tabla="productos")  # ← DECORADOR
def crear_producto(
    request: Request,  # ← NUEVO
    request_data: CrearProductoRequest,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    existing = db.query(Producto).filter(Producto.sku == request_data.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="El SKU ya existe")

    producto = Producto(
        sku=request_data.sku,
        nombre=request_data.nombre,
        descripcion=request_data.descripcion,
        categoria_id=request_data.categoria_id,
        precio_costo=request_data.precio_costo,
        precio_venta=request_data.precio_venta,
        stock_minimo=request_data.stock_minimo
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)

    return producto

@router.put("/{producto_id}")
@audit(accion="editar_producto", tabla="productos")  # ← DECORADOR
def editar_producto(
    request: Request,  # ← NUEVO
    producto_id: int,
    request_data: EditarProductoRequest,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if request_data.nombre is not None:
        producto.nombre = request_data.nombre
    if request_data.descripcion is not None:
        producto.descripcion = request_data.descripcion
    if request_data.categoria_id is not None:
        producto.categoria_id = request_data.categoria_id
    if request_data.precio_costo is not None:
        producto.precio_costo = request_data.precio_costo
    if request_data.precio_venta is not None:
        producto.precio_venta = request_data.precio_venta
    if request_data.stock_minimo is not None:
        producto.stock_minimo = request_data.stock_minimo
    if request_data.activo is not None:
        producto.activo = request_data.activo

    db.commit()
    db.refresh(producto)

    return producto

@router.delete("/{producto_id}")
@audit(accion="desactivar_producto", tabla="productos")  # ← DECORADOR
def eliminar_producto(
    request: Request,  # ← NUEVO
    producto_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    producto.activo = False
    db.commit()

    return {"message": "Producto desactivado correctamente"}