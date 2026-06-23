from sqlalchemy.orm import Session
from app.models import Venta, VentaDetalle, Producto
from app.schemas.venta import VentaCreate
from datetime import datetime

class VentaService:
    @staticmethod
    def crear_venta(db: Session, venta_data: VentaCreate, usuario_id: int):
        # Validar y crear venta (sin MetodoPago)
        # El campo metodo_pago ya es string en el modelo y schema
        nueva_venta = Venta(
            sede_id=venta_data.sede_id,
            usuario_id=usuario_id,
            total=venta_data.total,
            metodo_pago=venta_data.metodo_pago.lower(),  # Normalizar
            efectivo=venta_data.efectivo,
            transferencia=venta_data.transferencia,
            notas=venta_data.notas,
            created_at=datetime.now()
        )
        db.add(nueva_venta)
        db.flush()
        for detalle_data in venta_data.detalles:
            detalle = VentaDetalle(
                venta_id=nueva_venta.id,
                producto_id=detalle_data.producto_id,
                cantidad=detalle_data.cantidad,
                precio_unit=detalle_data.precio_unit,
                precio_original=detalle_data.precio_original,
                subtotal=detalle_data.subtotal
            )
            db.add(detalle)
        db.commit()
        return nueva_venta