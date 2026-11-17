import asyncio
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import uvicorn
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from src.authentication.application.security import get_current_user
from src.authentication.infrastructure.models import User
from src.authentication.presentation.router import router as autenticacion_router
from src.core.config import settings
from src.db.session import SessionLocal
from src.inscripcion.application.vencer_reservas import vencer_reservas
from src.inscripcion.infrastructure.email import enviar_email_vencimiento_reservas
from src.inscripcion.presentation.cohortes_router import router as cohortes_router
from src.inscripcion.presentation.legajos_router import router as legajos_router
from src.inscripcion.presentation.router import (
    documentos_router,
    router as inscripcion_router,
)
from src.inscripcion.presentation.workflow_router import router as workflow_router
from src.seguimiento_graduacion.presentacion.router import router as graduacion_router
from src.shared.http.encabezados import MiddlewareEncabezadosSeguridad
from src.shared.limite_solicitudes.servicio import limpiar_contadores_limite

_LOGGER = logging.getLogger(__name__)


def _procesar_vencimientos_reservas() -> None:
    with SessionLocal() as session:
        ahora = datetime.now(timezone.utc)
        limpiar_contadores_limite(
            session,
            anteriores_a=ahora - timedelta(days=1),
        )
        session.commit()
        vencidos = vencer_reservas(session, ahora=ahora)
        if not vencidos:
            return
        destinatarios = list(
            session.scalars(
                select(User.email).where(
                    User.role == "COORDINADOR",
                    User.is_active.is_(True),
                )
            )
        )
        legajos_notificados = [
            (legajo.numero_legajo or str(legajo.id), str(legajo.id))
            for legajo in vencidos
        ]

    if not destinatarios:
        _LOGGER.warning(
            "Hay %d reservas vencidas, pero no existen coordinadores activos",
            len(legajos_notificados),
        )
        return
    for destinatario in destinatarios:
        enviar_email_vencimiento_reservas(destinatario, legajos_notificados)


async def _ejecutar_tarea_diaria() -> None:
    while True:
        ahora = datetime.now().astimezone()
        proxima_ejecucion = ahora.replace(
            hour=3,
            minute=0,
            second=0,
            microsecond=0,
        )
        if proxima_ejecucion <= ahora:
            proxima_ejecucion += timedelta(days=1)
        await asyncio.sleep((proxima_ejecucion - ahora).total_seconds())
        try:
            await asyncio.to_thread(_procesar_vencimientos_reservas)
        except Exception:
            _LOGGER.exception("Falló la tarea diaria de vencimiento de reservas")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    tarea = asyncio.create_task(_ejecutar_tarea_diaria())
    try:
        yield
    finally:
        tarea.cancel()
        try:
            await tarea
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Sistema de Gestión de Posgrado UTN FRLP",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(MiddlewareEncabezadosSeguridad)

app.include_router(inscripcion_router)
app.include_router(documentos_router)
app.include_router(cohortes_router)
app.include_router(legajos_router)
app.include_router(workflow_router)
app.include_router(autenticacion_router)
app.include_router(graduacion_router)


@app.get("/health", tags=["health"], dependencies=[Depends(get_current_user)])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


def main() -> None:
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=settings.environment == "development",
    )
