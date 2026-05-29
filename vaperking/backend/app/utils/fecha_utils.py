from sqlalchemy import func, cast, Date
from datetime import date


def filtrar_por_fecha(query, modelo, fecha: date):
    """Aplica cast DateTime → Date para consultas precisas por día"""
    return query.filter(cast(modelo.created_at, Date) == fecha)


def filtrar_por_sede_y_fecha(query, modelo, sede_id: int, fecha: date):
    """Filtra por sede y fecha"""
    return query.filter(
        modelo.sede_id == sede_id,
        cast(modelo.created_at, Date) == fecha
    )