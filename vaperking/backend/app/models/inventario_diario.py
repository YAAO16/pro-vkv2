from sqlalchemy import Column, Integer, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class InventarioDiario(Base):
    __tablename__ = "inventario_diario"
    
    id = Column(Integer, primary_key=True, index=True)
    sede_id = Column(Integer, ForeignKey("sedes.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    stock_inicio = Column(Integer, nullable=False)
    entradas = Column(Integer, default=0)
    salidas = Column(Integer, default=0)
    stock_final = Column(Integer, nullable=False)
    
    # Relaciones
    sede = relationship("Sede", back_populates="inventarios")
    producto = relationship("Producto", back_populates="inventarios")