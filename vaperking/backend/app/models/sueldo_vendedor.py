from sqlalchemy import Column, Integer, Numeric, String, Date, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class SueldoVendedor(Base):
    __tablename__ = "sueldos_vendedores"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    sede_id = Column(Integer, ForeignKey("sedes.id"), nullable=False)
    mes = Column(Integer, nullable=False)
    ano = Column(Integer, nullable=False)
    sueldo_base = Column(Numeric(12, 2), nullable=False)
    comisiones = Column(Numeric(12, 2), default=0.00)
    bonificaciones = Column(Numeric(12, 2), default=0.00)
    deducciones = Column(Numeric(12, 2), default=0.00)
    total = Column(Numeric(12, 2), nullable=False)
    estado = Column(String(20), default="PENDIENTE")
    fecha_pago = Column(Date, nullable=True)
    observaciones = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())