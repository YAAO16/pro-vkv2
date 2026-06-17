from sqlalchemy import Column, Integer, Date, Float, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class CierreDiario(Base):
    __tablename__ = "cierres_diarios"
    
    id = Column(Integer, primary_key=True, index=True)
    sede_id = Column(Integer, ForeignKey("sedes.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    balance_sistema = Column(Float, nullable=False)
    efectivo_reportado = Column(Float, nullable=False)
    transferencia_reportada = Column(Float, nullable=False)
    diferencia = Column(Float, nullable=False)
    cerrado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    observaciones = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relaciones
    sede = relationship("Sede", back_populates="cierres")
    cerrado_por_rel = relationship("Usuario", foreign_keys=[cerrado_por], back_populates="cierres")