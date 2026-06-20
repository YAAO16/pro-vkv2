from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    accion = Column(String(100), nullable=False)
    tabla = Column(String(100), nullable=False)
    registro_id = Column(Integer, nullable=True)
    detalle = Column(JSON, nullable=True)
    ip = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    usuario = relationship("Usuario")