from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import date
from app.models.venta import Venta, MetodoPago
from app.models.cierre_diario import CierreDiario
from app.schemas.cierre import CierreDiarioCreate


class CierreService:
    @staticmethod
    def calcular_balance_sistema(db: Session, sede_id: int, fecha: date) -> dict:
        """Calcula el balance del sistema por sede y fecha"""
        ventas = db.query(Venta).filter(
            Venta.sede_id == sede_id,
            cast(Venta.created_at, Date) == fecha,
            Venta.anulada == False
        )

        total = ventas.with_entities(func.sum(Venta.total)).scalar() or 0.0

        efectivo = ventas.filter(Venta.metodo_pago == MetodoPago.EFECTIVO).with_entities(func.sum(Venta.total)).scalar() or 0.0
        transferencia = ventas.filter(Venta.metodo_pago == MetodoPago.TRANSFERENCIA).with_entities(func.sum(Venta.total)).scalar() or 0.0

        return {
            "total": round(total, 2),
            "efectivo": round(efectivo, 2),
            "transferencia": round(transferencia, 2)
        }

    @staticmethod
    def crear_cierre(db: Session, datos: CierreDiarioCreate, usuario_id: int) -> CierreDiario:
        """Registra un cierre diario"""
        balance = CierreService.calcular_balance_sistema(db, datos.sede_id, datos.fecha)
        diferencia = balance["total"] - (datos.efectivo_reportado + datos.transferencia_reportada)

        cierre = CierreDiario(
            sede_id=datos.sede_id,
            fecha=datos.fecha,
            balance_sistema=balance["total"],
            efectivo_reportado=datos.efectivo_reportado,
            transferencia_reportada=datos.transferencia_reportada,
            diferencia=round(diferencia, 2),
            cerrado_por=usuario_id,
            observaciones=datos.observaciones
        )

        db.add(cierre)
        db.commit()
        db.refresh(cierre)
        return cierre