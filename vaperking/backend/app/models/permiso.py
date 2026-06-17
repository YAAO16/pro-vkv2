from sqlalchemy import Column, Integer, String, DateTime, Table, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

# Tabla intermedia
usuario_permiso = Table(
    'usuario_permisos',
    Base.metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('usuario_id', Integer, ForeignKey('usuarios.id', ondelete='CASCADE')),
    Column('permiso_id', Integer, ForeignKey('permisos.id', ondelete='CASCADE')),
    Column('created_at', DateTime, default=datetime.now)
)

class Permiso(Base):
    __tablename__ = "permisos"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    descripcion = Column(String(255), nullable=True)
    modulo = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relaciones
    usuarios = relationship("Usuario", secondary=usuario_permiso, back_populates="permisos")