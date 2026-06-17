from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class ProductoDanado(Base):
    __tablename__ = "productos_danados"
    
    id = Column(Integer, primary_key=True, index=True)
    sede_id = Column(Integer, ForeignKey("sedes.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    nombre_producto = Column(String(200), nullable=False)
    cantidad = Column(Integer, nullable=False)
    motivo = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relaciones
    sede = relationship("Sede", back_populates="productos_danados")
    usuario = relationship("Usuario", back_populates="productos_danados")