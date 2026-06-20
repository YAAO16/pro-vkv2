from functools import wraps
from typing import Callable, Optional
from fastapi import Request
from sqlalchemy.orm import Session
from app.services import AuditService
import logging

logger = logging.getLogger(__name__)

def audit(accion: str, tabla: str) -> Callable:
    """
    Decorador para registrar auditoría automáticamente en cualquier endpoint.

    Args:
        accion: Nombre de la acción (ej: 'crear_usuario', 'editar_producto')
        tabla: Nombre de la tabla afectada (ej: 'usuarios', 'productos')

    Uso:
        @router.post("/")
        @audit(accion="crear_usuario", tabla="usuarios")
        def crear_usuario(request: Request, ...):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extraer request, db y current_user de los argumentos
            request = None
            db = None
            current_user = None

            # Buscar en args posicionales
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                if isinstance(arg, Session):
                    db = arg
                if hasattr(arg, 'id') and hasattr(arg, 'username'):
                    current_user = arg

            # Buscar en kwargs
            if 'request' in kwargs:
                request = kwargs['request']
            if 'db' in kwargs:
                db = kwargs['db']
            if 'current_user' in kwargs:
                current_user = kwargs['current_user']

            # Ejecutar la función original
            result = func(*args, **kwargs)

            # Registrar auditoría después de ejecutar la función
            try:
                if current_user and db:
                    # Extraer ID del registro creado/modificado
                    registro_id = None
                    if result and hasattr(result, 'id'):
                        registro_id = result.id
                    elif result and isinstance(result, dict) and 'id' in result:
                        registro_id = result['id']

                    # Extraer detalles (simplificado)
                    detalle = {}
                    if result and hasattr(result, '__dict__'):
                        try:
                            detalle = {k: v for k, v in result.__dict__.items()
                                      if not k.startswith('_')}
                        except:
                            pass

                    # Obtener IP
                    ip = request.client.host if request and request.client else None

                    # Registrar en auditoría
                    AuditService.registrar_accion(
                        db=db,
                        usuario=current_user,
                        accion=accion,
                        tabla=tabla,
                        registro_id=registro_id,
                        detalle=detalle,
                        ip=ip
                    )
                else:
                    logger.warning(f"No se pudo registrar auditoría para {accion}")
            except Exception as e:
                logger.error(f"Error registrando auditoría: {e}")

            return result

        return wrapper
    return decorator