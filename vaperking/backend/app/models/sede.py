from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Sede(Base):
    __tablename__ = "sedes"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    ciudad = Column(String(100), nullable=False)
    direccion = Column(String(255), nullable=True)
    telefono = Column(String(20), nullable=True)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relaciones
    usuarios = relationship("Usuario", back_populates="sede")
    ventas = relationship("Venta", back_populates="sede")
    inventarios = relationship("InventarioDiario", back_populates="sede")
    cierres = relationship("CierreDiario", back_populates="sede")
    gastos = relationship("Gasto", back_populates="sede")
    observaciones = relationship("Observacion", back_populates="sede")
    productos_danados = relationship("ProductoDanado", back_populates="sede")
    sueldos = relationship("SueldoVendedor", back_populates="sede")