from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date
from typing import Optional, List
from app.database import get_db
from app.dependencies import require_roles
from app.models.inventario_diario import InventarioDiario
from app.models.producto import Producto
from app.models.sede import Sede
from app.models.usuario import Usuario
from pydantic import BaseModel, Field

router = APIRouter(tags=["Inventario"])


# ========== SCHEMAS ==========
class AjusteStockCreate(BaseModel):
    sede_id: int = Field(..., description="ID de la sede")
    producto_id: int = Field(..., description="ID del producto")
    cantidad: int = Field(..., gt=0, description="Cantidad a ajustar (mayor a 0)")
    tipo: str = Field(..., description="Tipo de ajuste: 'entrada' o 'salida'")
    motivo: Optional[str] = Field(None, description="Motivo del ajuste")


class StockActualResponse(BaseModel):
    producto_id: int
    sku: str
    nombre: str
    stock_actual: int
    stock_minimo: int
    alerta: bool


# ========== ENDPOINTS ==========

@router.get("/stock-actual", response_model=List[StockActualResponse])
def stock_actual(
    sede_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor", "inventario"))
):
    """Obtiene el stock actual para una sede específica"""
    
    if current_user.rol == "vendedor":
        if not current_user.sede_id:
            raise HTTPException(status_code=400, detail="Vendedor no tiene sede asignada")
        sede_id = current_user.sede_id
    
    if not sede_id:
        raise HTTPException(status_code=400, detail="Debe especificar una sede")
    
    sede = db.query(Sede).filter(Sede.id == sede_id, Sede.activo == True).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    productos = db.query(Producto).filter(Producto.activo == True).order_by(Producto.nombre).all()
    
    if not productos:
        return []
    
    response = []
    for producto in productos:
        ultimo_inv = db.query(InventarioDiario).filter(
            InventarioDiario.sede_id == sede_id,
            InventarioDiario.producto_id == producto.id
        ).order_by(InventarioDiario.fecha.desc()).first()
        
        stock_actual = ultimo_inv.stock_final if ultimo_inv else 0
        stock_minimo = producto.stock_minimo or 5
        
        response.append(StockActualResponse(
            producto_id=producto.id,
            sku=producto.sku,
            nombre=producto.nombre,
            stock_actual=stock_actual,
            stock_minimo=stock_minimo,
            alerta=stock_actual < stock_minimo
        ))
    
    return response


@router.get("/stock-total", response_model=List[StockActualResponse])
def stock_total(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Admin: Stock total sumado de todas las sedes"""
    
    productos = db.query(Producto).filter(Producto.activo == True).order_by(Producto.nombre).all()
    sedes = db.query(Sede).filter(Sede.activo == True).all()
    sede_ids = [s.id for s in sedes]
    
    response = []
    for producto in productos:
        stock_total = 0
        stock_minimo = producto.stock_minimo or 5
        
        for sede_id in sede_ids:
            ultimo_inv = db.query(InventarioDiario).filter(
                InventarioDiario.sede_id == sede_id,
                InventarioDiario.producto_id == producto.id
            ).order_by(InventarioDiario.fecha.desc()).first()
            
            if ultimo_inv:
                stock_total += ultimo_inv.stock_final
        
        response.append(StockActualResponse(
            producto_id=producto.id,
            sku=producto.sku,
            nombre=producto.nombre,
            stock_actual=stock_total,
            stock_minimo=stock_minimo,
            alerta=stock_total < stock_minimo
        ))
    
    return response

@router.post("/ajuste", response_model=dict)
def registrar_ajuste(
    ajuste: AjusteStockCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor", "inventario"))
):
    """Registra un ajuste de inventario (entrada o salida)"""
    
    if ajuste.tipo not in ["entrada", "salida"]:
        raise HTTPException(status_code=400, detail="Tipo debe ser 'entrada' o 'salida'")
    
    if ajuste.cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")
    
    # Verificar sede
    sede = db.query(Sede).filter(Sede.id == ajuste.sede_id, Sede.activo == True).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    # Verificar permiso de vendedor
    if current_user.rol == "vendedor" and current_user.sede_id != ajuste.sede_id:
        raise HTTPException(status_code=403, detail="No tiene permisos para ajustar stock en esta sede")
    
    # Verificar producto
    producto = db.query(Producto).filter(Producto.id == ajuste.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    fecha_actual = date.today()
    
    # Obtener el registro más RECIENTE (incluyendo el de hoy si existe)
    ultimo_registro = db.query(InventarioDiario).filter(
        InventarioDiario.sede_id == ajuste.sede_id,
        InventarioDiario.producto_id == ajuste.producto_id
    ).order_by(InventarioDiario.fecha.desc(), InventarioDiario.id.desc()).first()
    
    # Determinar el stock actual (último stock_final registrado)
    stock_actual = ultimo_registro.stock_final if ultimo_registro else 0
    
    # Verificar si ya existe un registro para hoy
    registro_hoy = db.query(InventarioDiario).filter(
        InventarioDiario.sede_id == ajuste.sede_id,
        InventarioDiario.producto_id == ajuste.producto_id,
        InventarioDiario.fecha == fecha_actual
    ).first()
    
    if registro_hoy:
        # Si existe registro hoy, el stock_inicio debe ser el stock_actual ANTES de este ajuste
        # pero como ya hay registros hoy, el stock_inicio debe ser el stock_final actual
        # y luego sumamos/restamos
        stock_inicio = registro_hoy.stock_final
    else:
        # Si no hay registro hoy, el stock_inicio es el último stock_final registrado
        stock_inicio = stock_actual
    
    # Calcular nuevo stock
    if ajuste.tipo == "entrada":
        nuevo_stock = stock_inicio + ajuste.cantidad
        entradas = ajuste.cantidad
        salidas = 0
        operador = "+"
    else:
        if stock_inicio < ajuste.cantidad:
            raise HTTPException(
                status_code=400, 
                detail=f"Stock insuficiente. Stock actual: {stock_inicio}, Salida solicitada: {ajuste.cantidad}"
            )
        nuevo_stock = stock_inicio - ajuste.cantidad
        entradas = 0
        salidas = ajuste.cantidad
        operador = "-"
    
    if registro_hoy:
        # Actualizar el registro de hoy
        registro_hoy.entradas += entradas
        registro_hoy.salidas += salidas
        registro_hoy.stock_final = nuevo_stock
        # No actualizar stock_inicio porque ya representa el inicio del día
        mensaje = "Ajuste agregado al registro de hoy"
    else:
        # Crear nuevo registro para hoy
        nuevo_registro = InventarioDiario(
            sede_id=ajuste.sede_id,
            producto_id=ajuste.producto_id,
            fecha=fecha_actual,
            stock_inicio=stock_inicio,
            entradas=entradas,
            salidas=salidas,
            stock_final=nuevo_stock
        )
        db.add(nuevo_registro)
        mensaje = "Nuevo registro de inventario creado"
    
    db.commit()
    
    # Obtener el registro actualizado para la respuesta
    registro_actualizado = db.query(InventarioDiario).filter(
        InventarioDiario.sede_id == ajuste.sede_id,
        InventarioDiario.producto_id == ajuste.producto_id,
        InventarioDiario.fecha == fecha_actual
    ).first()
    
    return {
        "message": f"Ajuste de {ajuste.tipo} registrado correctamente",
        "stock_anterior": stock_inicio,
        "cantidad": ajuste.cantidad,
        "operador": operador,
        "nuevo_stock": nuevo_stock,
        "stock_final_bd": registro_actualizado.stock_final if registro_actualizado else nuevo_stock,
        "detalle": mensaje
    }

@router.get("/historial", response_model=List[dict])
@router.get("/inventario/historial", response_model=List[dict])
def historial_ajustes(
    sede_id: Optional[int] = Query(None, description="ID de la sede"),
    producto_id: Optional[int] = Query(None, description="ID del producto"),
    fecha_inicio: Optional[date] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    fecha_fin: Optional[date] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    tipo: Optional[str] = Query(None, description="Tipo de movimiento: 'entrada', 'salida'"),
    limit: int = Query(500, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Obtiene el historial detallado de movimientos de inventario - SOLO ADMIN"""
    
    query = db.query(InventarioDiario)
    
    if sede_id:
        query = query.filter(InventarioDiario.sede_id == sede_id)
    
    if producto_id:
        query = query.filter(InventarioDiario.producto_id == producto_id)
    
    if fecha_inicio:
        query = query.filter(InventarioDiario.fecha >= fecha_inicio)
    
    if fecha_fin:
        query = query.filter(InventarioDiario.fecha <= fecha_fin)
    
    if tipo == "entrada":
        query = query.filter(InventarioDiario.entradas > 0)
    elif tipo == "salida":
        query = query.filter(InventarioDiario.salidas > 0)
    
    movimientos = query.order_by(
        InventarioDiario.fecha.desc(), 
        InventarioDiario.id.desc()
    ).limit(limit).all()
    
    result = []
    for m in movimientos:
        if m.entradas > 0:
            tipo_mov = "entrada"
            cantidad = m.entradas
            icono = "➕"
            color = "#00ff88"
            operador = "+"
        else:
            tipo_mov = "salida"
            cantidad = m.salidas
            icono = "➖"
            color = "#ff4444"
            operador = "-"
        
        # Calcular correctamente el stock nuevo
        stock_calculado = m.stock_inicio + (m.entradas - m.salidas)
        
        result.append({
            "id": m.id,
            "fecha": m.fecha.strftime("%d/%m/%Y"),
            "fecha_original": m.fecha.isoformat(),
            "sede_id": m.sede_id,
            "sede_nombre": m.sede.nombre if m.sede else "Sin sede",
            "producto_id": m.producto_id,
            "producto_nombre": m.producto.nombre if m.producto else "Sin producto",
            "producto_sku": m.producto.sku if m.producto else "",
            "stock_anterior": m.stock_inicio,
            "cantidad": cantidad,
            "tipo": tipo_mov,
            "icono": icono,
            "color": color,
            "stock_nuevo": stock_calculado,
            "stock_final_bd": m.stock_final,
            "operador": operador,
            "cambio_stock": f"{m.stock_inicio} → {stock_calculado}",
            "detalle_cambio": f"{m.stock_inicio} {operador} {cantidad} = {stock_calculado}",
            "detalle": f"{icono} {tipo_mov.upper()}: {cantidad} unidades",
            "resumen": f"{m.producto.nombre if m.producto else 'Producto'} - {tipo_mov} de {cantidad} unidades. Stock: {m.stock_inicio} → {stock_calculado}"
        })
    
    return result


@router.get("/alertas", response_model=dict)
def alertas_stock(
    sede_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor", "inventario"))
):
    """Obtiene los productos con stock por debajo del mínimo"""
    
    if current_user.rol == "vendedor":
        if not current_user.sede_id:
            return {"alertas": [], "total_alertas": 0}
        sede_id = current_user.sede_id
    
    if not sede_id:
        return {"alertas": [], "total_alertas": 0}
    
    productos = db.query(Producto).filter(Producto.activo == True).all()
    
    subquery = db.query(
        InventarioDiario.producto_id,
        func.max(InventarioDiario.fecha).label("ultima_fecha")
    ).filter(
        InventarioDiario.sede_id == sede_id
    ).group_by(InventarioDiario.producto_id).subquery()
    
    ultimo_stock = db.query(
        InventarioDiario.producto_id,
        InventarioDiario.stock_final
    ).join(
        subquery,
        and_(
            InventarioDiario.producto_id == subquery.c.producto_id,
            InventarioDiario.fecha == subquery.c.ultima_fecha
        )
    ).all()
    
    stock_dict = {s.producto_id: s.stock_final for s in ultimo_stock}
    
    alertas = []
    for p in productos:
        stock_actual = stock_dict.get(p.id, 0)
        stock_minimo = p.stock_minimo or 5
        
        if stock_actual < stock_minimo:
            alertas.append({
                "producto_id": p.id,
                "sku": p.sku,
                "nombre": p.nombre,
                "stock_actual": stock_actual,
                "stock_minimo": stock_minimo,
                "alerta": True
            })
    
    return {"alertas": alertas, "total_alertas": len(alertas)}


@router.get("/movimientos/{producto_id}", response_model=List[dict])
def movimientos_producto(
    producto_id: int,
    sede_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor", "inventario"))
):
    """Obtiene el historial de movimientos para un producto específico"""
    
    query = db.query(InventarioDiario).filter(
        InventarioDiario.producto_id == producto_id
    )
    
    if sede_id:
        query = query.filter(InventarioDiario.sede_id == sede_id)
    elif current_user.rol == "vendedor" and current_user.sede_id:
        query = query.filter(InventarioDiario.sede_id == current_user.sede_id)
    
    movimientos = query.order_by(InventarioDiario.fecha.desc()).limit(limit).all()
    
    result = []
    for m in movimientos:
        result.append({
            "id": m.id,
            "fecha": m.fecha.strftime("%d/%m/%Y"),
            "sede_id": m.sede_id,
            "nombre_sede": m.sede.nombre if m.sede else "Sin sede",
            "producto_id": m.producto_id,
            "stock_inicio": m.stock_inicio,
            "entradas": m.entradas,
            "salidas": m.salidas,
            "stock_final": m.stock_final,
            "movimiento_neto": m.entradas - m.salidas
        })
    
    return result