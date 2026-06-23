from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.dependencies import get_current_user, verify_admin
from app.models import SueldoVendedor, Usuario, Sede
from app.decorators import audit
from pydantic import BaseModel
from typing import Optional
from datetime import date

router = APIRouter()

# === HELPERS ===
def normalizar_estado(estado: Optional[str]) -> str:
    if not estado:
        return "pendiente"
    lower = estado.lower()
    if lower not in ["pendiente", "pagado", "anulado"]:
        raise HTTPException(400, "Estado inválido")
    return lower

# === SCHEMAS ===
class CrearSueldoRequest(BaseModel):
    usuario_id: int
    sede_id: int
    mes: int
    ano: int
    sueldo_base: float
    comisiones: float = 0
    bonificaciones: float = 0
    deducciones: float = 0
    observaciones: Optional[str] = None

class EditarSueldoRequest(BaseModel):
    sueldo_base: Optional[float] = None
    comisiones: Optional[float] = None
    bonificaciones: Optional[float] = None
    deducciones: Optional[float] = None
    estado: Optional[str] = None
    fecha_pago: Optional[date] = None
    observaciones: Optional[str] = None

# === ENDPOINTS ===
@router.get("/")
def get_sueldos(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    sede_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    # Consulta base con eager loading de relaciones
    query = db.query(SueldoVendedor).options(
        joinedload(SueldoVendedor.usuario),
        joinedload(SueldoVendedor.sede)
    )

    # Si es vendedor, forzar filtro por su sede (y opcionalmente solo sus sueldos)
    if current_user.rol.value == "vendedor" and current_user.sede_id:
        query = query.filter(SueldoVendedor.sede_id == current_user.sede_id)
        # Opcional: si quieres que vea solo sus propios sueldos, descomenta:
        # query = query.filter(SueldoVendedor.usuario_id == current_user.id)
    else:
        # Admin: aplicar filtros opcionales
        if mes:
            query = query.filter(SueldoVendedor.mes == mes)
        if ano:
            query = query.filter(SueldoVendedor.ano == ano)
        if sede_id:
            query = query.filter(SueldoVendedor.sede_id == sede_id)

    sueldos = query.order_by(SueldoVendedor.created_at.desc()).all()

    # Enriquecer respuesta con nombres
    result = []
    for s in sueldos:
        result.append({
            "id": s.id,
            "usuario_id": s.usuario_id,
            "usuario_nombre": s.usuario.nombre_completo if s.usuario else "Usuario eliminado",
            "sede_id": s.sede_id,
            "sede_nombre": s.sede.nombre if s.sede else "Sede eliminada",
            "mes": s.mes,
            "ano": s.ano,
            "sueldo_base": s.sueldo_base,
            "comisiones": s.comisiones,
            "bonificaciones": s.bonificaciones,
            "deducciones": s.deducciones,
            "total": s.total,
            "estado": s.estado,
            "fecha_pago": s.fecha_pago,
            "observaciones": s.observaciones,
            "created_at": s.created_at
        })

    return result

@router.get("/vendedores")
def get_vendedores(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    vendedores = db.query(Usuario).filter(
        Usuario.rol == "vendedor",
        Usuario.activo == True
    ).all()
    return [{"id": v.id, "nombre": v.nombre_completo, "sede_id": v.sede_id} for v in vendedores]

@router.post("/")
@audit(accion="crear_sueldo", tabla="sueldos_vendedores")
def crear_sueldo(
    request: Request,
    data: CrearSueldoRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    # Verificar usuario
    usuario = db.query(Usuario).filter(Usuario.id == data.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Verificar sede
    sede = db.query(Sede).filter(Sede.id == data.sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    # Verificar duplicado
    existe = db.query(SueldoVendedor).filter(
        SueldoVendedor.usuario_id == data.usuario_id,
        SueldoVendedor.mes == data.mes,
        SueldoVendedor.ano == data.ano
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un sueldo para este usuario en este mes")

    total = data.sueldo_base + data.comisiones + data.bonificaciones - data.deducciones
    sueldo = SueldoVendedor(
        usuario_id=data.usuario_id,
        sede_id=data.sede_id,
        mes=data.mes,
        ano=data.ano,
        sueldo_base=data.sueldo_base,
        comisiones=data.comisiones,
        bonificaciones=data.bonificaciones,
        deducciones=data.deducciones,
        total=total,
        observaciones=data.observaciones
    )

    db.add(sueldo)
    db.commit()
    db.refresh(sueldo)

    # Devolver con nombres
    return {
        "id": sueldo.id,
        "usuario_id": sueldo.usuario_id,
        "usuario_nombre": usuario.nombre_completo,
        "sede_id": sueldo.sede_id,
        "sede_nombre": sede.nombre,
        "mes": sueldo.mes,
        "ano": sueldo.ano,
        "sueldo_base": sueldo.sueldo_base,
        "comisiones": sueldo.comisiones,
        "bonificaciones": sueldo.bonificaciones,
        "deducciones": sueldo.deducciones,
        "total": sueldo.total,
        "estado": sueldo.estado,
        "fecha_pago": sueldo.fecha_pago,
        "observaciones": sueldo.observaciones,
        "created_at": sueldo.created_at
    }

@router.put("/{sueldo_id}")
@audit(accion="editar_sueldo", tabla="sueldos_vendedores")
def editar_sueldo(
    request: Request,
    sueldo_id: int,
    data: EditarSueldoRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    sueldo = db.query(SueldoVendedor).filter(SueldoVendedor.id == sueldo_id).first()
    if not sueldo:
        raise HTTPException(status_code=404, detail="Sueldo no encontrado")

    if data.sueldo_base is not None:
        sueldo.sueldo_base = data.sueldo_base
    if data.comisiones is not None:
        sueldo.comisiones = data.comisiones
    if data.bonificaciones is not None:
        sueldo.bonificaciones = data.bonificaciones
    if data.deducciones is not None:
        sueldo.deducciones = data.deducciones
    if data.estado is not None:
        sueldo.estado = normalizar_estado(data.estado)
    if data.fecha_pago is not None:
        sueldo.fecha_pago = data.fecha_pago
    if data.observaciones is not None:
        sueldo.observaciones = data.observaciones

    # Recalcular total
    sueldo.total = sueldo.sueldo_base + sueldo.comisiones + sueldo.bonificaciones - sueldo.deducciones

    db.commit()
    db.refresh(sueldo)

    return {"message": "Sueldo actualizado correctamente", "sueldo": sueldo}

@router.delete("/{sueldo_id}")
@audit(accion="anular_sueldo", tabla="sueldos_vendedores")
def eliminar_sueldo(
    request: Request,
    sueldo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin)
):
    sueldo = db.query(SueldoVendedor).filter(SueldoVendedor.id == sueldo_id).first()
    if not sueldo:
        raise HTTPException(status_code=404, detail="Sueldo no encontrado")

    sueldo.estado = "anulado"
    db.commit()

    return {"message": "Sueldo anulado correctamente"}