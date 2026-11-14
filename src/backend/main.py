
import asyncio
import sys

from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.usuarios import (
    modelos as _modelos_usuarios,
)
from src.usuarios.rutas import (
    enrutador as usuarios_rutas,
)

from src.carreras import (
    modelos as _modelos_carreras,
)
from src.carreras.rutas import (
    enrutador as carreras_rutas,
)

from src.seminarios.infraestructura import (
    orm_modelos as _modelos_seminarios,
)
from src.seminarios.presentacion.rutas import (
    enrutador as seminarios_rutas,
)

from src.configuracion_publica.infraestructura import (
    orm_modelos as _modelos_configuracion_publica,
)
from src.configuracion_publica.presentacion.rutas import (
    enrutador as configuracion_publica_rutas,
)

from src.noticias.infraestructura import (
    orm_modelos as _modelos_noticias,
)
from src.noticias.presentacion.rutas import (
    enrutador as noticias_rutas,
)


load_dotenv()


if sys.platform == "win32":
    asyncio.set_event_loop_policy(
        asyncio.WindowsSelectorEventLoopPolicy()
    )


from src.compartido.conexion import Base, engine
from src.infraestructura import (
    orm_modelos as _modelos_generales,
)
from src.inscripcion.presentacion.rutas import (
    enrutador as inscripcion_rutas,
)

from src.inscripcion.infraestructura import (
    cohortes_modelos as _modelos_cohortes,
)

from src.inscripcion.presentacion.cohortes_rutas import (
    enrutador as cohortes_rutas,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(
                Base.metadata.create_all
            )

        yield

    finally:
        await engine.dispose()


app = FastAPI(
    title="Sistema de Posgrado API",
    description=(
        "API para la gestión del "
        "Sistema de Posgrado FRLP"
    ),
    version="0.1.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount(
    "/uploads",
    StaticFiles(
        directory="uploads"
    ),
    name="uploads",
)


@app.get("/")
def read_root():
    return {
        "message": (
            "Bienvenido a la API del "
            "Sistema de Posgrado"
        )
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }


app.include_router(
    inscripcion_rutas
)

app.include_router(
    usuarios_rutas
)

app.include_router(
    carreras_rutas
)

app.include_router(
    seminarios_rutas
)

app.include_router(
    configuracion_publica_rutas
)

app.include_router(
    noticias_rutas
)

app.include_router(
    cohortes_rutas
)
