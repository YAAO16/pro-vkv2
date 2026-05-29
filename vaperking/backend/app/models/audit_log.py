from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    accion = Column(String(100), nullable=False)
    tabla = Column(String(100), nullable=False)
    registro_id = Column(Integer, nullable=True)
    detalle = Column(JSON, nullable=True)
    ip = Column(String(45), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    # NO hay relaciones aquí