from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional, List
from app.database import get_db
from app.dependencies import require_roles
from app.models.cierre_diario import CierreDiario
from app.models.usuario import Usuario
from app.models.sede import Sede
from app.schemas.cierre import CierreDiarioCreate, CierreDiarioUpdate, CierreDiarioResponse, CierrePreviewResponse
from app.services.cierre_service import CierreService

router = APIRouter()


@router.get("/", response_model=List[CierreDiarioResponse])
def listar_cierres(
    sede_id: Optional[int] = Query(None),
    fecha: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Lista cierres diarios con filtros"""
    query = db.query(CierreDiario)
    
    if current_user.rol == "vendedor":
        query = query.filter(CierreDiario.sede_id == current_user.sede_id)
    elif sede_id:
        query = query.filter(CierreDiario.sede_id == sede_id)
    
    if fecha:
        query = query.filter(CierreDiario.fecha == fecha)
    
    cierres = query.order_by(CierreDiario.fecha.desc()).all()
    
    result = []
    for c in cierres:
        sede = db.query(Sede).filter(Sede.id == c.sede_id).first()
        sede_nombre = sede.nombre if sede else "Desconocida"
        usuario = db.query(Usuario).filter(Usuario.id == c.cerrado_por).first()
        nombre_usuario = usuario.nombre_completo if usuario else "Sistema"
        
        result.append(CierreDiarioResponse(
            id=c.id,
            sede_id=c.sede_id,
            sede_nombre=sede_nombre,
            fecha=c.fecha,
            balance_sistema=float(c.balance_sistema),
            efectivo_reportado=float(c.efectivo_reportado),
            transferencia_reportada=float(c.transferencia_reportada),
            diferencia=float(c.diferencia),
            cerrado_por=c.cerrado_por,
            nombre_usuario=nombre_usuario,
            observaciones=c.observaciones,
            created_at=c.created_at
        ))
    
    return result


@router.get("/preview", response_model=CierrePreviewResponse)
def preview_cierre(
    sede_id: int = Query(...),
    fecha: date = Query(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Vista previa del balance del sistema sin cerrar"""
    if current_user.rol == "vendedor" and current_user.sede_id != sede_id:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver esta sede")
    
    balance = CierreService.calcular_balance_sistema(db, sede_id, fecha)
    
    return CierrePreviewResponse(
        sede_id=sede_id,
        fecha=fecha,
        balance_sistema=balance["total"],
        ventas_efectivo=balance["efectivo"],
        ventas_transferencia=balance["transferencia"],
        total_ventas=0
    )


@router.post("/", response_model=CierreDiarioResponse)
def crear_cierre(
    datos: CierreDiarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin", "vendedor"))
):
    """Registra un cierre diario"""
    if current_user.rol == "vendedor" and current_user.sede_id != datos.sede_id:
        raise HTTPException(status_code=403, detail="No puedes cerrar otra sede")
    
    existe = db.query(CierreDiario).filter(
        CierreDiario.sede_id == datos.sede_id,
        CierreDiario.fecha == datos.fecha
    ).first()
    
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un cierre para esta fecha y sede")
    
    cierre = CierreService.crear_cierre(db, datos, current_user.id)
    
    sede = db.query(Sede).filter(Sede.id == cierre.sede_id).first()
    sede_nombre = sede.nombre if sede else "Desconocida"
    
    return CierreDiarioResponse(
        id=cierre.id,
        sede_id=cierre.sede_id,
        sede_nombre=sede_nombre,
        fecha=cierre.fecha,
        balance_sistema=float(cierre.balance_sistema),
        efectivo_reportado=float(cierre.efectivo_reportado),
        transferencia_reportada=float(cierre.transferencia_reportada),
        diferencia=float(cierre.diferencia),
        cerrado_por=cierre.cerrado_por,
        nombre_usuario=current_user.nombre_completo,
        observaciones=cierre.observaciones,
        created_at=cierre.created_at
    )


@router.put("/{cierre_id}", response_model=CierreDiarioResponse)
def actualizar_cierre(
    cierre_id: int,
    datos: CierreDiarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Actualiza un cierre diario (solo admin)"""
    cierre = db.query(CierreDiario).filter(CierreDiario.id == cierre_id).first()
    if not cierre:
        raise HTTPException(status_code=404, detail="Cierre no encontrado")
    
    if datos.efectivo_reportado is not None:
        cierre.efectivo_reportado = datos.efectivo_reportado
    if datos.transferencia_reportada is not None:
        cierre.transferencia_reportada = datos.transferencia_reportada
    if datos.observaciones is not None:
        cierre.observaciones = datos.observaciones
    
    # Recalcular diferencia
    cierre.diferencia = cierre.balance_sistema - (cierre.efectivo_reportado + cierre.transferencia_reportada)
    
    db.commit()
    db.refresh(cierre)
    
    sede = db.query(Sede).filter(Sede.id == cierre.sede_id).first()
    sede_nombre = sede.nombre if sede else "Desconocida"
    usuario = db.query(Usuario).filter(Usuario.id == cierre.cerrado_por).first()
    nombre_usuario = usuario.nombre_completo if usuario else "Sistema"
    
    return CierreDiarioResponse(
        id=cierre.id,
        sede_id=cierre.sede_id,
        sede_nombre=sede_nombre,
        fecha=cierre.fecha,
        balance_sistema=float(cierre.balance_sistema),
        efectivo_reportado=float(cierre.efectivo_reportado),
        transferencia_reportada=float(cierre.transferencia_reportada),
        diferencia=float(cierre.diferencia),
        cerrado_por=cierre.cerrado_por,
        nombre_usuario=nombre_usuario,
        observaciones=cierre.observaciones,
        created_at=cierre.created_at
    )


@router.delete("/{cierre_id}")
def eliminar_cierre(
    cierre_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Elimina un cierre diario (solo admin)"""
    cierre = db.query(CierreDiario).filter(CierreDiario.id == cierre_id).first()
    if not cierre:
        raise HTTPException(status_code=404, detail="Cierre no encontrado")
    
    db.delete(cierre)
    db.commit()
    
    return {"message": "Cierre eliminado correctamente"}