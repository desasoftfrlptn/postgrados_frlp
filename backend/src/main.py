from fastapi import FastAPI

from src.shared.auth.router import router as auth_router

app = FastAPI(title="Posgrados FRLP")
app.include_router(auth_router, prefix="/api/v1")