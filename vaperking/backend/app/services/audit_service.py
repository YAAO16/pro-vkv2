from sqlalchemy.orm import Session
from app.models import AuditLog
from app.models.usuario import Usuario
from typing import Optional, Any
import json

class AuditService:

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
            # Convertir detalle a JSON si es necesario
            detalle_json = None
            if detalle:
                if isinstance(detalle, dict):
                    detalle_json = detalle
                else:
                    try:
                        detalle_json = json.loads(detalle) if isinstance(detalle, str) else detalle
                    except:
                        detalle_json = {"info": str(detalle)}

            audit = AuditLog(
                usuario_id=usuario.id,
                accion=accion,
                tabla=tabla,
                registro_id=registro_id,
                detalle=detalle_json,
                ip=ip
            )
            db.add(audit)
            db.commit()
        except Exception as e:
            # No fallar si hay error en auditoría
            print(f"Error registrando auditoría: {e}")
            db.rollback()