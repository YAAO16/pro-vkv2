from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Gasto(Base):
    __tablename__ = "gastos"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False)
    motivo = Column(String(255), nullable=False)
    valor = Column(Float, nullable=False)
    descripcion = Column(Text, nullable=True)
    sede_id = Column(Integer, ForeignKey("sedes.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    sede = relationship("Sede", back_populates="gastos")
    usuario = relationship("Usuario", back_populates="gastos")