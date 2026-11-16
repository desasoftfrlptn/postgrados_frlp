import hashlib
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable

from fastapi import HTTPException, Request, status
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from src.db.session import SessionLocal
from src.shared.limite_solicitudes.modelos import ContadorLimiteSolicitudes


@dataclass(frozen=True)
class ResultadoLimiteSolicitudes:
    permitido: bool
    restantes: int
    reintentar_en_segundos: int


def consumir_limite_solicitudes(
    sesion: Session,
    *,
    clave: str,
    limite: int,
    segundos_ventana: int,
    ahora: datetime | None = None,
) -> ResultadoLimiteSolicitudes:
    if not clave.strip():
        raise ValueError("La clave del límite de solicitudes no puede estar vacía")
    if limite < 1 or segundos_ventana < 1:
        raise ValueError("El límite y la ventana deben ser mayores que cero")

    tiempo_actual = ahora or datetime.now(timezone.utc)
    epoca = int(tiempo_actual.timestamp())
    inicio_ventana_epoca = epoca - epoca % segundos_ventana
    inicio_ventana = datetime.fromtimestamp(inicio_ventana_epoca, timezone.utc)
    reintentar_en = max(
        1,
        math.ceil(inicio_ventana_epoca + segundos_ventana - tiempo_actual.timestamp()),
    )
    hash_clave = hashlib.sha256(clave.encode("utf-8")).hexdigest()
    dialecto = sesion.get_bind().dialect.name
    if dialecto == "postgresql":
        insertar = postgresql_insert
    elif dialecto == "sqlite":
        insertar = sqlite_insert
    else:
        raise RuntimeError(f"El limitador no soporta el dialecto {dialecto}")

    sentencia = insertar(ContadorLimiteSolicitudes).values(
        hash_clave=hash_clave,
        inicio_ventana=inicio_ventana,
        cantidad=1,
    )
    sentencia = sentencia.on_conflict_do_update(
        index_elements=[
            ContadorLimiteSolicitudes.hash_clave,
            ContadorLimiteSolicitudes.inicio_ventana,
        ],
        set_={"cantidad": ContadorLimiteSolicitudes.cantidad + 1},
    ).returning(ContadorLimiteSolicitudes.cantidad)

    try:
        cantidad = sesion.scalar(sentencia)
        sesion.commit()
    except SQLAlchemyError:
        sesion.rollback()
        raise

    intentos = int(cantidad or 0)
    return ResultadoLimiteSolicitudes(
        permitido=intentos <= limite,
        restantes=max(0, limite - intentos),
        reintentar_en_segundos=reintentar_en,
    )


def limpiar_contadores_limite(sesion: Session, *, anteriores_a: datetime) -> int:
    resultado = sesion.execute(
        delete(ContadorLimiteSolicitudes).where(
            ContadorLimiteSolicitudes.inicio_ventana < anteriores_a
        )
    )
    return resultado.rowcount or 0


def dependencia_limite_solicitudes(
    *,
    limite: int,
    segundos_ventana: int,
    alcance: str,
    construir_clave: Callable[[Request], str] | None = None,
) -> Callable[..., None]:
    if not alcance.strip():
        raise ValueError("El alcance del limitador no puede estar vacío")
    if limite < 1 or segundos_ventana < 1:
        raise ValueError("El límite y la ventana deben ser mayores que cero")

    def aplicar_limite(
        solicitud: Request,
    ) -> None:
        clave_solicitud = (
            construir_clave(solicitud)
            if construir_clave is not None
            else solicitud.client.host if solicitud.client is not None else "desconocida"
        )
        with SessionLocal() as sesion:
            resultado = consumir_limite_solicitudes(
                sesion,
                clave=f"{alcance}:{clave_solicitud}",
                limite=limite,
                segundos_ventana=segundos_ventana,
            )
        if not resultado.permitido:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Se alcanzó el límite de solicitudes. Intentá nuevamente más tarde.",
                headers={"Retry-After": str(resultado.reintentar_en_segundos)},
            )

    return aplicar_limite
