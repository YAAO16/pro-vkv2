from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.permiso import usuario_permiso
from datetime import datetime
import enum

class RolUsuario(str, enum.Enum):
    admin = "admin"
    vendedor = "vendedor"

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    nombre_completo = Column(String(150), nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum(RolUsuario), nullable=False)
    sede_id = Column(Integer, ForeignKey("sedes.id"), nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relaciones
    sede = relationship("Sede", back_populates="usuarios")
    ventas = relationship("Venta", foreign_keys="Venta.usuario_id", back_populates="usuario")
    permisos = relationship("Permiso", secondary=usuario_permiso, back_populates="usuarios")
    cierres = relationship("CierreDiario", foreign_keys="CierreDiario.cerrado_por", back_populates="cerrado_por_rel")
    gastos = relationship("Gasto", back_populates="usuario")
    observaciones = relationship("Observacion", back_populates="usuario")
    productos_danados = relationship("ProductoDanado", back_populates="usuario")
    sueldos = relationship("SueldoVendedor", back_populates="usuario")