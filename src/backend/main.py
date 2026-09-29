import asyncio
import sys
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.autenticacion.infraestructura import orm_modelos as _modelos_autenticacion

load_dotenv()

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from src.compartido.conexion import Base, engine
from src.infraestructura import orm_modelos as _modelos_generales
from src.inscripcion.presentacion.rutas import enrutador as inscripcion_rutas


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        yield
    finally:
        await engine.dispose()


app = FastAPI(
    title="Sistema de Posgrado API",
    description="API para la gestión del Sistema de Posgrado FRLP",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API del Sistema de Posgrado (FastAPI)"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(inscripcion_rutas)
