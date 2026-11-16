import os

import uvicorn
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.authentication.application.security import get_current_user
from src.authentication.presentation.router import router as autenticacion_router
from src.core.config import settings
from src.inscripcion.presentation.router import (
    documentos_router,
    router as inscripcion_router,
)

app = FastAPI(
    title="Sistema de Gestión de Posgrado UTN FRLP",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inscripcion_router)
app.include_router(documentos_router)
app.include_router(autenticacion_router)


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
