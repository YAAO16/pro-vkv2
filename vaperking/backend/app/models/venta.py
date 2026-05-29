from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Enum, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class MetodoPago(str, enum.Enum):
    efectivo = "efectivo"
    transferencia = "transferencia"


class Venta(Base):
    __tablename__ = "ventas"
    
    id = Column(Integer, primary_key=True, index=True)
    sede_id = Column(Integer, ForeignKey("sedes.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    total = Column(Float, nullable=False)
    metodo_pago = Column(Enum(MetodoPago), nullable=False)
    created_at = Column(DateTime, default=func.now())
    notas = Column(Text, nullable=True)
    anulada = Column(Boolean, default=False)
    anulada_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    motivo_anulacion = Column(Text, nullable=True)
    
    # Relaciones
    sede = relationship("Sede", back_populates="ventas")
    usuario = relationship("Usuario", foreign_keys=[usuario_id], back_populates="ventas")
    anulada_por_rel = relationship("Usuario", foreign_keys=[anulada_por], back_populates="ventas_anuladas")
    detalles = relationship("VentaDetalle", back_populates="venta", cascade="all, delete-orphan")


class VentaDetalle(Base):
    __tablename__ = "venta_detalle"
    
    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey("ventas.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unit = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    
    # Relaciones
    venta = relationship("Venta", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalles_venta")