from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.dependencies import require_roles
from app.models.producto import Producto, Categoria
from app.models.usuario import Usuario
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class ProductoCreate(BaseModel):
    sku: str
    nombre: str
    descripcion: Optional[str] = None
    categoria_id: Optional[int] = None
    precio_costo: float
    precio_venta: float
    stock_minimo: int = 5


class ProductoUpdate(BaseModel):
    sku: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    categoria_id: Optional[int] = None
    precio_costo: Optional[float] = None
    precio_venta: Optional[float] = None
    stock_minimo: Optional[int] = None
    activo: Optional[bool] = None


class ProductoResponse(BaseModel):
    id: int
    sku: str
    nombre: str
    descripcion: Optional[str]
    categoria_id: Optional[int]
    nombre_categoria: Optional[str]
    precio_costo: float
    precio_venta: float
    stock_minimo: int
    activo: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CategoriaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    padre_id: Optional[int] = None


class CategoriaResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]
    padre_id: Optional[int]

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ProductoResponse])
def listar_productos(
    activo: Optional[bool] = Query(True),
    categoria_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Lista todos los productos con filtros opcionales"""
    query = db.query(Producto)
    
    if activo is not None:
        query = query.filter(Producto.activo == activo)
    if categoria_id:
        query = query.filter(Producto.categoria_id == categoria_id)
    if search:
        query = query.filter(
            (Producto.nombre.like(f"%{search}%")) | 
            (Producto.sku.like(f"%{search}%"))
        )
    
    productos = query.order_by(Producto.nombre).all()
    
    result = []
    for p in productos:
        # Obtener nombre de categoría manualmente
        categoria_nombre = None
        if p.categoria_id:
            categoria = db.query(Categoria).filter(Categoria.id == p.categoria_id).first()
            if categoria:
                categoria_nombre = categoria.nombre
        
        result.append(ProductoResponse(
            id=p.id,
            sku=p.sku,
            nombre=p.nombre,
            descripcion=p.descripcion,
            categoria_id=p.categoria_id,
            nombre_categoria=categoria_nombre,
            precio_costo=float(p.precio_costo),
            precio_venta=float(p.precio_venta),
            stock_minimo=p.stock_minimo,
            activo=p.activo,
            created_at=p.created_at
        ))
    
    return result


@router.get("/categorias/", response_model=List[CategoriaResponse])
def listar_categorias(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Lista todas las categorías"""
    categorias = db.query(Categoria).all()
    
    result = []
    for c in categorias:
        result.append(CategoriaResponse(
            id=c.id,
            nombre=c.nombre,
            descripcion=c.descripcion,
            padre_id=c.padre_id
        ))
    
    return result


@router.get("/{producto_id}", response_model=ProductoResponse)
def obtener_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Obtiene un producto por ID"""
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    categoria_nombre = None
    if producto.categoria_id:
        categoria = db.query(Categoria).filter(Categoria.id == producto.categoria_id).first()
        if categoria:
            categoria_nombre = categoria.nombre
    
    return ProductoResponse(
        id=producto.id,
        sku=producto.sku,
        nombre=producto.nombre,
        descripcion=producto.descripcion,
        categoria_id=producto.categoria_id,
        nombre_categoria=categoria_nombre,
        precio_costo=float(producto.precio_costo),
        precio_venta=float(producto.precio_venta),
        stock_minimo=producto.stock_minimo,
        activo=producto.activo,
        created_at=producto.created_at
    )


@router.post("/", response_model=ProductoResponse)
def crear_producto(
    producto_data: ProductoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Crea un nuevo producto (solo admin)"""
    existe = db.query(Producto).filter(Producto.sku == producto_data.sku).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un producto con este SKU")
    
    nuevo_producto = Producto(
        sku=producto_data.sku,
        nombre=producto_data.nombre,
        descripcion=producto_data.descripcion,
        categoria_id=producto_data.categoria_id,
        precio_costo=producto_data.precio_costo,
        precio_venta=producto_data.precio_venta,
        stock_minimo=producto_data.stock_minimo
    )
    
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)
    
    categoria_nombre = None
    if nuevo_producto.categoria_id:
        categoria = db.query(Categoria).filter(Categoria.id == nuevo_producto.categoria_id).first()
        if categoria:
            categoria_nombre = categoria.nombre
    
    return ProductoResponse(
        id=nuevo_producto.id,
        sku=nuevo_producto.sku,
        nombre=nuevo_producto.nombre,
        descripcion=nuevo_producto.descripcion,
        categoria_id=nuevo_producto.categoria_id,
        nombre_categoria=categoria_nombre,
        precio_costo=float(nuevo_producto.precio_costo),
        precio_venta=float(nuevo_producto.precio_venta),
        stock_minimo=nuevo_producto.stock_minimo,
        activo=nuevo_producto.activo,
        created_at=nuevo_producto.created_at
    )


@router.put("/{producto_id}", response_model=ProductoResponse)
def actualizar_producto(
    producto_id: int,
    producto_data: ProductoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Actualiza un producto (solo admin)"""
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if producto_data.sku is not None:
        existe = db.query(Producto).filter(
            Producto.sku == producto_data.sku,
            Producto.id != producto_id
        ).first()
        if existe:
            raise HTTPException(status_code=400, detail="Ya existe otro producto con este SKU")
        producto.sku = producto_data.sku
    if producto_data.nombre is not None:
        producto.nombre = producto_data.nombre
    if producto_data.descripcion is not None:
        producto.descripcion = producto_data.descripcion
    if producto_data.categoria_id is not None:
        producto.categoria_id = producto_data.categoria_id
    if producto_data.precio_costo is not None:
        producto.precio_costo = producto_data.precio_costo
    if producto_data.precio_venta is not None:
        producto.precio_venta = producto_data.precio_venta
    if producto_data.stock_minimo is not None:
        producto.stock_minimo = producto_data.stock_minimo
    if producto_data.activo is not None:
        producto.activo = producto_data.activo
    
    db.commit()
    db.refresh(producto)
    
    categoria_nombre = None
    if producto.categoria_id:
        categoria = db.query(Categoria).filter(Categoria.id == producto.categoria_id).first()
        if categoria:
            categoria_nombre = categoria.nombre
    
    return ProductoResponse(
        id=producto.id,
        sku=producto.sku,
        nombre=producto.nombre,
        descripcion=producto.descripcion,
        categoria_id=producto.categoria_id,
        nombre_categoria=categoria_nombre,
        precio_costo=float(producto.precio_costo),
        precio_venta=float(producto.precio_venta),
        stock_minimo=producto.stock_minimo,
        activo=producto.activo,
        created_at=producto.created_at
    )


@router.delete("/{producto_id}")
def eliminar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Elimina (desactiva) un producto (solo admin)"""
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    producto.activo = False
    db.commit()
    
    return {"message": "Producto desactivado correctamente"}


@router.post("/categorias/", response_model=CategoriaResponse)
def crear_categoria(
    categoria_data: CategoriaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Crea una nueva categoría (solo admin)"""
    nueva_categoria = Categoria(
        nombre=categoria_data.nombre,
        descripcion=categoria_data.descripcion,
        padre_id=categoria_data.padre_id
    )
    
    db.add(nueva_categoria)
    db.commit()
    db.refresh(nueva_categoria)
    
    return CategoriaResponse(
        id=nueva_categoria.id,
        nombre=nueva_categoria.nombre,
        descripcion=nueva_categoria.descripcion,
        padre_id=nueva_categoria.padre_id
    )