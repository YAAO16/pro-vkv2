from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Categoria(Base):
    __tablename__ = "categorias"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    padre_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    
    # Relaciones
    subcategorias = relationship("Categoria", back_populates="padre", remote_side=[id])
    padre = relationship("Categoria", back_populates="subcategorias", remote_side=[padre_id])
    productos = relationship("Producto", back_populates="categoria")


class Producto(Base):
    __tablename__ = "productos"
    
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    precio_costo = Column(Float, nullable=False)
    precio_venta = Column(Float, nullable=False)
    stock_minimo = Column(Integer, default=5)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    
    # Relaciones
    categoria = relationship("Categoria", back_populates="productos")
    inventarios = relationship("InventarioDiario", back_populates="producto")
    detalles_venta = relationship("VentaDetalle", back_populates="producto")
    