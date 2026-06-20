import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Boolean, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class MetodoPago(str, enum.Enum):
    EFECTIVO = "efectivo"
    TRANSFERENCIA = "transferencia"
    MIXTO = "mixto"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            lower = value.lower()
            for member in cls:
                if member.value == lower:
                    return member
        return None

class Venta(Base):
    __tablename__ = "ventas"
    
    id = Column(Integer, primary_key=True, index=True)
    sede_id = Column(Integer, ForeignKey("sedes.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    total = Column(Float, nullable=False)
    metodo_pago = Column(SQLEnum(MetodoPago), nullable=False)
    efectivo = Column(Float, nullable=True)
    transferencia = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    notas = Column(Text, nullable=True)
    anulada = Column(Boolean, default=False)
    anulada_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    motivo_anulacion = Column(Text, nullable=True)
    
    # Relaciones
    sede = relationship("Sede", back_populates="ventas")
    usuario = relationship("Usuario", foreign_keys=[usuario_id], back_populates="ventas")
    detalles = relationship("VentaDetalle", back_populates="venta", cascade="all, delete-orphan")

class VentaDetalle(Base):
    __tablename__ = "venta_detalle"
    
    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey("ventas.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unit = Column(Float, nullable=False)
    precio_original = Column(Float, nullable=True)
    subtotal = Column(Float, nullable=False)
    
    # Relaciones
    venta = relationship("Venta", back_populates="detalles")
    producto = relationship("Producto", back_populates="ventas_detalle")