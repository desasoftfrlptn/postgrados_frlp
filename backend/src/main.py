from fastapi import FastAPI

from src.carga_academica.presentation.router import router as carga_academica_router
from src.shared.auth.router import router as auth_router

app = FastAPI(title="Posgrados FRLP")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(carga_academica_router, prefix="/api/v1")