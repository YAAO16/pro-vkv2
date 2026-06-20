from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.services import AuditService
from app.models import AccionAudit
import re

class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware que audita TODAS las peticiones automáticamente"""
    
    # Rutas excluidas de auditoría
    EXCLUDED_PATHS = [
        r'^/docs',
        r'^/redoc',
        r'^/openapi.json',
        r'^/health',
        r'^/$',
        r'^/api/v1/auth/login$',
        r'^/api/v1/auth/logout$',
        r'^/favicon.ico$'
    ]
    
    async def dispatch(self, request: Request, call_next):
        # Verificar si la ruta debe ser excluida
        path = request.url.path
        for pattern in self.EXCLUDED_PATHS:
            if re.match(pattern, path):
                return await call_next(request)
        
        # Obtener token y usuario si existe
        token = None
        if 'authorization' in request.headers:
            auth_header = request.headers['authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]
        
        # Ejecutar la petición
        response = await call_next(request)
        
        # Solo auditar si la respuesta fue exitosa (2xx)
        if 200 <= response.status_code < 300:
            # Registrar en background (usando un hilo o tarea asíncrona)
            # Por simplicidad, aquí solo registramos si hay token
            if token:
                try:
                    db = SessionLocal()
                    # Aquí podrías decodificar el token para obtener el usuario
                    # Por ahora, solo registramos la acción genérica
                    AuditService.registrar(
                        db=db,
                        usuario=None,  # Se resolverá con el token
                        accion=AccionAudit.VIEW,
                        tabla=path.split('/')[-2] if len(path.split('/')) > 2 else 'unknown',
                        ip=request.client.host if request.client else None,
                        user_agent=request.headers.get('user-agent'),
                        url=str(request.url),
                        metodo=request.method
                    )
                    db.close()
                except Exception as e:
                    print(f"Error en middleware de auditoría: {e}")
        
        return response