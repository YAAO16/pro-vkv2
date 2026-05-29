# alembic/env.py
from app.database import Base
from app.models import *  # Importa todos tus modelos

target_metadata = Base.metadata  # Línea importante