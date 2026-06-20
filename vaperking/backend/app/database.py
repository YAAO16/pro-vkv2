from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings
import logging

# Desactivar logs
logging.getLogger('sqlalchemy.engine').setLevel(logging.ERROR)
logging.getLogger('sqlalchemy.engine.Engine').disabled = True

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Importar todos los modelos para crear las tablas
from app.models import (
    Sede, Usuario, Permiso, Producto, Categoria,
    Venta, VentaDetalle, InventarioDiario, CierreDiario,
    Gasto, Observacion, ProductoDanado, SueldoVendedor,
    Transferencia, AuditLog
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()