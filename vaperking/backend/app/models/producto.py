from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Categoria(Base):
    __tablename__ = "categorias"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    padre_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    
    productos = relationship("Producto", back_populates="categoria")

class Producto(Base):
    __tablename__ = "productos"
    
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    precio_costo = Column(Float, nullable=False)
    precio_venta = Column(Float, nullable=False)
    stock_minimo = Column(Integer, default=5)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relaciones
    categoria = relationship("Categoria", back_populates="productos")
    ventas_detalle = relationship("VentaDetalle", back_populates="producto")
    inventarios = relationship("InventarioDiario", back_populates="producto")