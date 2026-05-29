from sqlalchemy import Column, Integer, ForeignKey, DateTime, Enum, String
from sqlalchemy.sql import func
from app.database import Base
import enum


class EstadoTransferencia(str, enum.Enum):
    PENDIENTE = "pendiente"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"


class Transferencia(Base):
    __tablename__ = "transferencias"

    id = Column(Integer, primary_key=True, index=True)
    sede_origen = Column(Integer, ForeignKey("sedes.id"), nullable=False)
    sede_destino = Column(Integer, ForeignKey("sedes.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    solicitado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    aprobado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    estado = Column(Enum(EstadoTransferencia), default=EstadoTransferencia.PENDIENTE)
    created_at = Column(DateTime, server_default=func.now())
    # NO hay relaciones aquí