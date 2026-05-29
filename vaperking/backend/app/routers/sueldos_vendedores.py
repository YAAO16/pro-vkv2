from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.dependencies import require_roles
from app.models.usuario import Usuario
from app.models.sueldo_vendedor import SueldoVendedor
from app.models.sede import Sede
from app.schemas.sueldo_vendedor import (
    SueldoVendedorCreate, SueldoVendedorUpdate, 
    SueldoVendedorResponse, ResumenSueldosResponse
)

router = APIRouter()


@router.get("/vendedores")
def listar_vendedores(
    sede_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Lista vendedores para seleccionar en formulario"""
    query = db.query(Usuario).filter(Usuario.rol == "vendedor", Usuario.activo == True)
    if sede_id:
        query = query.filter(Usuario.sede_id == sede_id)
    
    vendedores = query.all()
    return [
        {"id": v.id, "nombre": v.nombre_completo, "sede_id": v.sede_id}
        for v in vendedores
    ]


@router.get("/resumen", response_model=List[ResumenSueldosResponse])
def resumen_sueldos(
    mes: int = Query(..., ge=1, le=12),
    ano: int = Query(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Resumen de sueldos por sede para un mes específico"""
    sedes = db.query(Sede).filter(Sede.activo == True).all()
    
    result = []
    for sede in sedes:
        sueldos = db.query(SueldoVendedor).filter(
            SueldoVendedor.sede_id == sede.id,
            SueldoVendedor.mes == mes,
            SueldoVendedor.ano == ano
        ).all()
        
        total_sueldos = sum(float(s.total) for s in sueldos)
        total_comisiones = sum(float(s.comisiones) for s in sueldos)
        cantidad_vendedores = len(sueldos)
        
        result.append(ResumenSueldosResponse(
            sede_id=sede.id,
            sede_nombre=sede.nombre,
            total_sueldos=total_sueldos,
            total_comisiones=total_comisiones,
            cantidad_vendedores=cantidad_vendedores
        ))
    
    return result


@router.post("/calcular-total")
def calcular_total(
    sueldo_base: float,
    comisiones: float = 0,
    bonificaciones: float = 0,
    deducciones: float = 0
):
    """Calcula el total basado en los componentes"""
    total = sueldo_base + comisiones + bonificaciones - deducciones
    return {"total": round(total, 2)}


@router.get("/", response_model=List[SueldoVendedorResponse])
def listar_sueldos(
    sede_id: Optional[int] = Query(None),
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    usuario_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Lista todos los sueldos (solo admin)"""
    query = db.query(SueldoVendedor)
    
    if sede_id:
        query = query.filter(SueldoVendedor.sede_id == sede_id)
    if mes:
        query = query.filter(SueldoVendedor.mes == mes)
    if ano:
        query = query.filter(SueldoVendedor.ano == ano)
    if estado:
        query = query.filter(SueldoVendedor.estado == estado)
    if usuario_id:
        query = query.filter(SueldoVendedor.usuario_id == usuario_id)
    
    sueldos = query.order_by(SueldoVendedor.ano.desc(), SueldoVendedor.mes.desc()).all()
    
    result = []
    for s in sueldos:
        # Obtener el nombre del usuario manualmente
        usuario = db.query(Usuario).filter(Usuario.id == s.usuario_id).first()
        nombre_usuario = usuario.nombre_completo if usuario else "Desconocido"
        
        # Obtener el nombre de la sede manualmente
        sede = db.query(Sede).filter(Sede.id == s.sede_id).first()
        nombre_sede = sede.nombre if sede else "Desconocida"
        
        result.append(SueldoVendedorResponse(
            id=s.id,
            usuario_id=s.usuario_id,
            nombre_usuario=nombre_usuario,
            sede_id=s.sede_id,
            sede_nombre=nombre_sede,
            mes=s.mes,
            ano=s.ano,
            sueldo_base=float(s.sueldo_base),
            comisiones=float(s.comisiones),
            bonificaciones=float(s.bonificaciones),
            deducciones=float(s.deducciones),
            total=float(s.total),
            estado=s.estado,
            fecha_pago=s.fecha_pago,
            observaciones=s.observaciones,
            created_at=s.created_at,
            updated_at=s.updated_at
        ))
    
    return result


@router.post("/", response_model=SueldoVendedorResponse)
def crear_sueldo(
    data: SueldoVendedorCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Crea un registro de sueldo para un vendedor"""
    # Verificar que el usuario existe y es vendedor
    usuario = db.query(Usuario).filter(Usuario.id == data.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if usuario.rol != "vendedor":
        raise HTTPException(status_code=400, detail="El usuario no es vendedor")
    
    # Verificar que la sede existe
    sede = db.query(Sede).filter(Sede.id == data.sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    
    # Verificar que no exista ya un registro para ese mes/ano/vendedor
    existente = db.query(SueldoVendedor).filter(
        SueldoVendedor.usuario_id == data.usuario_id,
        SueldoVendedor.mes == data.mes,
        SueldoVendedor.ano == data.ano
    ).first()
    
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un registro de sueldo para este vendedor en este mes")
    
    nuevo = SueldoVendedor(
        usuario_id=data.usuario_id,
        sede_id=data.sede_id,
        mes=data.mes,
        ano=data.ano,
        sueldo_base=data.sueldo_base,
        comisiones=data.comisiones,
        bonificaciones=data.bonificaciones,
        deducciones=data.deducciones,
        total=data.total,
        fecha_pago=data.fecha_pago,
        observaciones=data.observaciones,
        estado=data.estado or "PENDIENTE"
    )
    
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    
    # Obtener nombres para la respuesta
    nombre_usuario = usuario.nombre_completo
    nombre_sede = sede.nombre
    
    return SueldoVendedorResponse(
        id=nuevo.id,
        usuario_id=nuevo.usuario_id,
        nombre_usuario=nombre_usuario,
        sede_id=nuevo.sede_id,
        sede_nombre=nombre_sede,
        mes=nuevo.mes,
        ano=nuevo.ano,
        sueldo_base=float(nuevo.sueldo_base),
        comisiones=float(nuevo.comisiones),
        bonificaciones=float(nuevo.bonificaciones),
        deducciones=float(nuevo.deducciones),
        total=float(nuevo.total),
        estado=nuevo.estado,
        fecha_pago=nuevo.fecha_pago,
        observaciones=nuevo.observaciones,
        created_at=nuevo.created_at,
        updated_at=nuevo.updated_at
    )


@router.put("/{sueldo_id}", response_model=SueldoVendedorResponse)
def actualizar_sueldo(
    sueldo_id: int,
    data: SueldoVendedorUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Actualiza un registro de sueldo"""
    sueldo = db.query(SueldoVendedor).filter(SueldoVendedor.id == sueldo_id).first()
    if not sueldo:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    if data.sueldo_base is not None:
        sueldo.sueldo_base = data.sueldo_base
    if data.comisiones is not None:
        sueldo.comisiones = data.comisiones
    if data.bonificaciones is not None:
        sueldo.bonificaciones = data.bonificaciones
    if data.deducciones is not None:
        sueldo.deducciones = data.deducciones
    if data.total is not None:
        sueldo.total = data.total
    if data.estado is not None:
        sueldo.estado = data.estado
    if data.fecha_pago is not None:
        sueldo.fecha_pago = data.fecha_pago
    if data.observaciones is not None:
        sueldo.observaciones = data.observaciones
    
    db.commit()
    db.refresh(sueldo)
    
    # Obtener nombres para la respuesta
    usuario = db.query(Usuario).filter(Usuario.id == sueldo.usuario_id).first()
    sede = db.query(Sede).filter(Sede.id == sueldo.sede_id).first()
    nombre_usuario = usuario.nombre_completo if usuario else "Desconocido"
    nombre_sede = sede.nombre if sede else "Desconocida"
    
    return SueldoVendedorResponse(
        id=sueldo.id,
        usuario_id=sueldo.usuario_id,
        nombre_usuario=nombre_usuario,
        sede_id=sueldo.sede_id,
        sede_nombre=nombre_sede,
        mes=sueldo.mes,
        ano=sueldo.ano,
        sueldo_base=float(sueldo.sueldo_base),
        comisiones=float(sueldo.comisiones),
        bonificaciones=float(sueldo.bonificaciones),
        deducciones=float(sueldo.deducciones),
        total=float(sueldo.total),
        estado=sueldo.estado,
        fecha_pago=sueldo.fecha_pago,
        observaciones=sueldo.observaciones,
        created_at=sueldo.created_at,
        updated_at=sueldo.updated_at
    )


@router.delete("/{sueldo_id}")
def eliminar_sueldo(
    sueldo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("admin"))
):
    """Elimina un registro de sueldo"""
    sueldo = db.query(SueldoVendedor).filter(SueldoVendedor.id == sueldo_id).first()
    if not sueldo:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    db.delete(sueldo)
    db.commit()
    
    return {"message": "Registro de sueldo eliminado correctamente"}