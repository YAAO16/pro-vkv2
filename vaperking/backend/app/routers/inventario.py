from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date
from app.database import get_db
from app.dependencies import get_current_user, verify_admin
from app.models import InventarioDiario, Producto, Sede
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class ActualizarInventarioRequest(BaseModel):
    producto_id: int
    stock_final: int
    sede_id: int

class StockItem(BaseModel):
    id: int
    nombre: str
    sku: str
    precio_venta: float
    stock_final: int

@router.get("/stock-actual", response_model=List[StockItem])
def get_stock_actual(
    sede_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Obtener el último inventario para cada producto en la sede
    subquery = db.query(
        InventarioDiario.producto_id,
        func.max(InventarioDiario.fecha).label("ultima_fecha")
    ).filter(
        InventarioDiario.sede_id == sede_id
    ).group_by(InventarioDiario.producto_id).subquery()
    
    resultados = db.query(
        Producto.id,
        Producto.nombre,
        Producto.sku,
        Producto.precio_venta,
        InventarioDiario.stock_final
    ).join(
        subquery,
        (Producto.id == subquery.c.producto_id)
    ).join(
        InventarioDiario,
        and_(
            InventarioDiario.producto_id == subquery.c.producto_id,
            InventarioDiario.fecha == subquery.c.ultima_fecha,
            InventarioDiario.sede_id == sede_id
        )
    ).all()
    
    # Convertir a objetos StockItem
    items = []
    for row in resultados:
        items.append({
            "id": row.id,
            "nombre": row.nombre,
            "sku": row.sku,
            "precio_venta": row.precio_venta,
            "stock_final": row.stock_final
        })
    
    return items

@router.post("/stock")
def actualizar_stock(
    request: ActualizarInventarioRequest,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    # Verificar producto
    producto = db.query(Producto).filter(Producto.id == request.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Verificar sede
    sede = db.query(Sede).filter(Sede.id == request.sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    # Obtener el último inventario
    ultimo = db.query(InventarioDiario).filter(
        InventarioDiario.sede_id == request.sede_id,
        InventarioDiario.producto_id == request.producto_id
    ).order_by(InventarioDiario.fecha.desc()).first()
    
    stock_inicio = ultimo.stock_final if ultimo else 0
    entradas = max(0, request.stock_final - stock_inicio)
    salidas = max(0, stock_inicio - request.stock_final)
    
    nuevo_inventario = InventarioDiario(
        sede_id=request.sede_id,
        producto_id=request.producto_id,
        fecha=date.today(),
        stock_inicio=stock_inicio,
        entradas=entradas,
        salidas=salidas,
        stock_final=request.stock_final
    )
    
    db.add(nuevo_inventario)
    db.commit()
    
    return {"message": "Inventario actualizado correctamente"}