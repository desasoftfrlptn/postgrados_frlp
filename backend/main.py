import os

import uvicorn
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.authentication.presentation.router import router as auth_router
from src.authentication.application.security import get_current_user
from src.core.config import settings
from src.inscripcion.presentation.router import router as inscripcion_router
from src.shared.http.errores import registrar_manejador_error_aplicacion
from src.shared.http.encabezados import MiddlewareEncabezadosSeguridad

app = FastAPI(
    title="Sistema de Gestión de Posgrado UTN FRLP",
    docs_url="/api/docs" if settings.environment.lower() == "development" else None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if settings.environment.lower() == "development" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(MiddlewareEncabezadosSeguridad)
registrar_manejador_error_aplicacion(app)

app.include_router(inscripcion_router)
app.include_router(auth_router)


@app.get("/health", tags=["health"])
def health_check(_: object = Depends(get_current_user)) -> dict[str, str]:
    return {"status": "ok"}


def main() -> None:
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=settings.environment == "development",
    )
