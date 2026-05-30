from sqlalchemy import Column, Integer, Float, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Gasto(Base):
    __tablename__ = "gastos"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, index=True)
    motivo = Column(String(255), nullable=False)
    valor = Column(Float, nullable=False)
    descripcion = Column(Text, nullable=True)
    sede_id = Column(Integer, ForeignKey("sedes.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    sede = relationship("Sede", back_populates="gastos")
    usuario = relationship("Usuario", back_populates="gastos")