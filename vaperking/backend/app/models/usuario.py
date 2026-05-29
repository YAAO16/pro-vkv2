from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class RolUsuario(str, enum.Enum):
    admin = "admin"
    vendedor = "vendedor"
    inventario = "inventario"


class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    nombre_completo = Column(String(150), nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum(RolUsuario), nullable=False)
    sede_id = Column(Integer, ForeignKey("sedes.id"), nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    
    # Relaciones
    sede = relationship("Sede", back_populates="usuarios")
    
    # Especificar foreign_keys para evitar ambigüedad
    ventas = relationship("Venta", foreign_keys="Venta.usuario_id", back_populates="usuario")
    ventas_anuladas = relationship("Venta", foreign_keys="Venta.anulada_por", back_populates="anulada_por_rel")
    cierres = relationship("CierreDiario", foreign_keys="CierreDiario.cerrado_por", back_populates="cerrado_por_rel")