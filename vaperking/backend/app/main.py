from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, ventas, productos, inventario, cierres, sedes, reportes, usuarios
from app.routers import productos_danados, observaciones, sueldos_vendedores

app = FastAPI(
    title="VaperKing API",
    version="1.0.0",
    description="Sistema de gestión comercial para tiendas de vapeo"
)

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de routers (todos completos)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(ventas.router, prefix="/api/v1/ventas", tags=["Ventas"])
app.include_router(productos.router, prefix="/api/v1/productos", tags=["Productos"])
app.include_router(inventario.router, prefix="/api/v1", tags=["Inventario"])
app.include_router(cierres.router, prefix="/api/v1/cierres", tags=["Cierres Diarios"])
app.include_router(sedes.router, prefix="/api/v1/sedes", tags=["Sedes"])
app.include_router(reportes.router, prefix="/api/v1/reportes", tags=["Reportes"])
app.include_router(usuarios.router, prefix="/api/v1/usuarios", tags=["Usuarios"])
app.include_router(productos_danados.router, prefix="/api/v1/productos-danados", tags=["Productos Dañados"])
app.include_router(observaciones.router, prefix="/api/v1/observaciones", tags=["Observaciones"])
app.include_router(sueldos_vendedores.router, prefix="/api/v1/sueldos", tags=["Sueldos Vendedores"])

@app.get("/")
def root():
    return {"message": "VaperKing API v1.0.0", "status": "running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}