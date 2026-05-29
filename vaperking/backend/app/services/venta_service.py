from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import date
from app.models.venta import Venta, VentaDetalle, MetodoPago
from app.models.producto import Producto
from app.models.usuario import Usuario
from app.schemas.venta import VentaCreate


class VentaService:
    @staticmethod
    def registrar_venta(db: Session, venta_data: VentaCreate, usuario_id: int) -> Venta:
        """Registra una nueva venta con sus detalles"""
        total = sum(d.cantidad * d.precio_unit for d in venta_data.detalles)

        nueva_venta = Venta(
            sede_id=venta_data.sede_id,
            usuario_id=usuario_id,
            total=round(total, 2),
            metodo_pago=venta_data.metodo_pago,
            notas=venta_data.notas
        )

        db.add(nueva_venta)
        db.flush()

        for detalle in venta_data.detalles:
            producto = db.query(Producto).filter(Producto.id == detalle.producto_id).first()
            subtotal = detalle.cantidad * detalle.precio_unit

            venta_detalle = VentaDetalle(
                venta_id=nueva_venta.id,
                producto_id=detalle.producto_id,
                cantidad=detalle.cantidad,
                precio_unit=detalle.precio_unit,
                subtotal=round(subtotal, 2)
            )
            db.add(venta_detalle)

        db.commit()
        db.refresh(nueva_venta)
        return nueva_venta

    @staticmethod
    def listar_ventas(db: Session, sede_id: int = None, fecha: date = None, metodo_pago: str = None):
        """Lista ventas con filtros opcionales"""
        query = db.query(Venta)

        if sede_id:
            query = query.filter(Venta.sede_id == sede_id)
        if fecha:
            query = query.filter(cast(Venta.created_at, Date) == fecha)
        if metodo_pago:
            query = query.filter(Venta.metodo_pago == metodo_pago)

        return query.order_by(Venta.created_at.desc()).all()