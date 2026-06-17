from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, verify_admin
from app.models import Producto, Categoria
from pydantic import BaseModel
from typing import Optional

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

@router.get("/{producto_id}")
def get_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@router.post("/")
def crear_producto(
    request: CrearProductoRequest,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    # Verificar SKU único
    existing = db.query(Producto).filter(Producto.sku == request.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="El SKU ya existe")
    
    producto = Producto(
        sku=request.sku,
        nombre=request.nombre,
        descripcion=request.descripcion,
        categoria_id=request.categoria_id,
        precio_costo=request.precio_costo,
        precio_venta=request.precio_venta,
        stock_minimo=request.stock_minimo
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto

@router.put("/{producto_id}")
def editar_producto(
    producto_id: int,
    request: EditarProductoRequest,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if request.nombre is not None:
        producto.nombre = request.nombre
    if request.descripcion is not None:
        producto.descripcion = request.descripcion
    if request.categoria_id is not None:
        producto.categoria_id = request.categoria_id
    if request.precio_costo is not None:
        producto.precio_costo = request.precio_costo
    if request.precio_venta is not None:
        producto.precio_venta = request.precio_venta
    if request.stock_minimo is not None:
        producto.stock_minimo = request.stock_minimo
    if request.activo is not None:
        producto.activo = request.activo
    
    db.commit()
    db.refresh(producto)
    return producto

@router.delete("/{producto_id}")
def eliminar_producto(
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