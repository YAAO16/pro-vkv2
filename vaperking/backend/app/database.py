from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging
from dotenv import load_dotenv

load_dotenv()

# Deshabilitar logs de SQLAlchemy en producción
logging.getLogger('sqlalchemy.engine').setLevel(logging.ERROR)
logging.getLogger('sqlalchemy.engine.Engine').disabled = True

# Configuración de la base de datos
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://invjar_user:invjar_pass@localhost:3306/vaperking_db?auth_plugin=mysql_native_password")

# Para Render, usar SSL si es necesario
if "render.com" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL + "?ssl=true"

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()