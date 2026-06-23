from sqlalchemy.orm import Session
from app.models import AuditLog
from app.models.usuario import Usuario
from typing import Optional, Any
import json
from datetime import datetime, date

class AuditService:

    @staticmethod
    def sanitizar_detalle(detalle: Any) -> Any:
        """Convierte objetos datetime y date a string ISO, y maneja objetos no serializables."""
        if isinstance(detalle, (datetime, date)):
            return detalle.isoformat()
        elif isinstance(detalle, dict):
            return {k: AuditService.sanitizar_detalle(v) for k, v in detalle.items()}
        elif isinstance(detalle, list):
            return [AuditService.sanitizar_detalle(item) for item in detalle]
        elif hasattr(detalle, '__dict__'):
            # Para objetos como modelos SQLAlchemy, convertimos a dict y sanitizamos
            try:
                return AuditService.sanitizar_detalle({k: v for k, v in detalle.__dict__.items() if not k.startswith('_')})
            except:
                return str(detalle)
        else:
            return detalle

    @staticmethod
    def registrar_accion(
        db: Session,
        usuario: Usuario,
        accion: str,
        tabla: str,
        registro_id: Optional[int] = None,
        detalle: Optional[Any] = None,
        ip: Optional[str] = None
    ):
        """Registra una acción en el log de auditoría"""
        try:
            # Sanitizar detalle antes de guardar
            detalle_limpio = AuditService.sanitizar_detalle(detalle) if detalle else None

            audit = AuditLog(
                usuario_id=usuario.id,
                accion=accion,
                tabla=tabla,
                registro_id=registro_id,
                detalle=detalle_limpio,
                ip=ip
            )
            db.add(audit)
            db.commit()
        except Exception as e:
            # No fallar si hay error en auditoría
            print(f"Error registrando auditoría: {e}")
            db.rollback()