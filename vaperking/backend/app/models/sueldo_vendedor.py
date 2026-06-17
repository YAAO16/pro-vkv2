from sqlalchemy import Column, Integer, Float, Date, ForeignKey, String, Text, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import enum

class EstadoSueldo(str, enum.Enum):
    PENDIENTE = "pendiente"
    PAGADO = "pagado"
    ANULADO = "anulado"

class SueldoVendedor(Base):
    __tablename__ = "sueldos_vendedores"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    sede_id = Column(Integer, ForeignKey("sedes.id"), nullable=False)
    mes = Column(Integer, nullable=False)
    ano = Column(Integer, nullable=False)
    sueldo_base = Column(Float, nullable=False)
    comisiones = Column(Float, default=0)
    bonificaciones = Column(Float, default=0)
    deducciones = Column(Float, default=0)
    total = Column(Float, nullable=False)
    estado = Column(String(20), default="pendiente")
    fecha_pago = Column(Date, nullable=True)
    observaciones = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="sueldos")
    sede = relationship("Sede", back_populates="sueldos")