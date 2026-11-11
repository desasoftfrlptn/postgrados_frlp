from fastapi import FastAPI

from src.shared.auth.router import router as auth_router
from src.gestion_documental.presentation.router import (
    router as documentos_router,
)

app = FastAPI(title="Posgrados FRLP")

app.include_router(auth_router, prefix="/api/v1")
# Registrar las rutas de Gestión Documental bajo el prefijo común de la API.
app.include_router(documentos_router, prefix="/api/v1")