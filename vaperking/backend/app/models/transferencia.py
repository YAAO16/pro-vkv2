from sqlalchemy import Column, Integer, ForeignKey, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
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
    estado = Column(String(20), default="pendiente")
    created_at = Column(DateTime, default=datetime.now)
    
    # Relaciones
    sede_origen_rel = relationship("Sede", foreign_keys=[sede_origen])
    sede_destino_rel = relationship("Sede", foreign_keys=[sede_destino])
    producto = relationship("Producto")
    solicitante = relationship("Usuario", foreign_keys=[solicitado_por])
    aprobador = relationship("Usuario", foreign_keys=[aprobado_por])