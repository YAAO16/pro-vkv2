from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user, verify_admin
from app.models import SueldoVendedor, Usuario, Sede
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
    # No se incluye estado, se usa el valor por defecto del modelo

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
    current_user = Depends(get_current_user)
):
    query = db.query(SueldoVendedor)
    if mes:
        query = query.filter(SueldoVendedor.mes == mes)
    if ano:
        query = query.filter(SueldoVendedor.ano == ano)
    if sede_id:
        query = query.filter(SueldoVendedor.sede_id == sede_id)
    sueldos = query.order_by(SueldoVendedor.created_at.desc()).all()
    return sueldos

@router.get("/vendedores")
def get_vendedores(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    vendedores = db.query(Usuario).filter(
        Usuario.rol == "vendedor",
        Usuario.activo == True
    ).all()
    return [{"id": v.id, "nombre": v.nombre_completo, "sede_id": v.sede_id} for v in vendedores]

@router.post("/")
def crear_sueldo(
    request: CrearSueldoRequest,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    usuario = db.query(Usuario).filter(Usuario.id == request.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    sede = db.query(Sede).filter(Sede.id == request.sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")

    existe = db.query(SueldoVendedor).filter(
        SueldoVendedor.usuario_id == request.usuario_id,
        SueldoVendedor.mes == request.mes,
        SueldoVendedor.ano == request.ano
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un sueldo para este usuario en este mes")

    total = request.sueldo_base + request.comisiones + request.bonificaciones - request.deducciones
    sueldo = SueldoVendedor(
        usuario_id=request.usuario_id,
        sede_id=request.sede_id,
        mes=request.mes,
        ano=request.ano,
        sueldo_base=request.sueldo_base,
        comisiones=request.comisiones,
        bonificaciones=request.bonificaciones,
        deducciones=request.deducciones,
        total=total,
        observaciones=request.observaciones,
        # estado se asigna automáticamente al valor por defecto (PENDIENTE)
    )
    db.add(sueldo)
    db.commit()
    db.refresh(sueldo)
    return sueldo

@router.put("/{sueldo_id}")
def editar_sueldo(
    sueldo_id: int,
    request: EditarSueldoRequest,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    sueldo = db.query(SueldoVendedor).filter(SueldoVendedor.id == sueldo_id).first()
    if not sueldo:
        raise HTTPException(status_code=404, detail="Sueldo no encontrado")

    if request.sueldo_base is not None:
        sueldo.sueldo_base = request.sueldo_base
    if request.comisiones is not None:
        sueldo.comisiones = request.comisiones
    if request.bonificaciones is not None:
        sueldo.bonificaciones = request.bonificaciones
    if request.deducciones is not None:
        sueldo.deducciones = request.deducciones
    if request.estado is not None:
        sueldo.estado = normalizar_estado(request.estado)
    if request.fecha_pago is not None:
        sueldo.fecha_pago = request.fecha_pago
    if request.observaciones is not None:
        sueldo.observaciones = request.observaciones

    sueldo.total = sueldo.sueldo_base + sueldo.comisiones + sueldo.bonificaciones - sueldo.deducciones
    db.commit()
    db.refresh(sueldo)
    return sueldo

@router.delete("/{sueldo_id}")
def eliminar_sueldo(
    sueldo_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(verify_admin)
):
    sueldo = db.query(SueldoVendedor).filter(SueldoVendedor.id == sueldo_id).first()
    if not sueldo:
        raise HTTPException(status_code=404, detail="Sueldo no encontrado")
    sueldo.estado = "anulado"   # Mayúsculas
    db.commit()
    return {"message": "Sueldo anulado correctamente"}