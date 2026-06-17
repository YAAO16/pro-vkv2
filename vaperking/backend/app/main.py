from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import (
    auth, usuarios, permisos, ventas, productos, sedes,
    reportes, inventario, gastos, cierres, observaciones,
    productos_danados, sueldos_vendedores
)
import logging

# Desactivar logs de SQLAlchemy y otras bibliotecas
logging.getLogger('sqlalchemy').setLevel(logging.ERROR)
logging.getLogger('sqlalchemy.engine').setLevel(logging.ERROR)
logging.getLogger('sqlalchemy.engine.Engine').disabled = True
logging.getLogger('sqlalchemy.pool').setLevel(logging.ERROR)
logging.getLogger('sqlalchemy.orm').setLevel(logging.ERROR)
logging.getLogger('uvicorn.access').disabled = True
logging.getLogger('uvicorn.error').disabled = True

app = FastAPI(
    title="VaperKing API",
    description="Sistema de gestión para tiendas de vapeo",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(usuarios.router, prefix="/api/v1/usuarios", tags=["Usuarios"])
app.include_router(permisos.router, prefix="/api/v1/permisos", tags=["Permisos"])
app.include_router(ventas.router, prefix="/api/v1/ventas", tags=["Ventas"])
app.include_router(productos.router, prefix="/api/v1/productos", tags=["Productos"])
app.include_router(sedes.router, prefix="/api/v1/sedes", tags=["Sedes"])
app.include_router(reportes.router, prefix="/api/v1/reportes", tags=["Reportes"])
app.include_router(inventario.router, prefix="/api/v1", tags=["Inventario"])
app.include_router(gastos.router, prefix="/api/v1/gastos", tags=["Gastos"])
app.include_router(cierres.router, prefix="/api/v1/cierres", tags=["Cierres Diarios"])
app.include_router(observaciones.router, prefix="/api/v1/observaciones", tags=["Observaciones"])
app.include_router(productos_danados.router, prefix="/api/v1/productos-danados", tags=["Productos Dañados"])
app.include_router(sueldos_vendedores.router, prefix="/api/v1/sueldos", tags=["Sueldos Vendedores"])

@app.get("/")
def root():
    return {"message": "VaperKing API", "version": "2.0.0"}

@app.get("/health")
def health_check():
    return {"status": "ok"}