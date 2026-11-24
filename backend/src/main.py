from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager

from src.inscripcion.presentation.controller import router as inscripcion_router
from src.acceso.controllers.controller import router as acceso_router
from src.shared.auth.router import router as auth_router
from src.gestion_documental.presentation.router import router as documentos_router
from src.seguimiento_graduacion.presentation.router import router as graduacion_router
from src.carga_academica.presentation.router import router as carga_academica_router
from src.inscripcion.presentation.controller_periodos import router as periodos_router
from src.inscripcion.presentation.cohortes_controller import router as cohortes_router

from src.inscripcion.presentation.estadisticas_controller import router as estadisticas_router

from src.config import CORS_ORIGINS
from src.shared.tareas.programador import crear_programador


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tareas diarias (US-CORE-010, US-B-005): arrancan con la app y se apagan con ella
    programador = crear_programador()
    programador.start()
    yield
    programador.shutdown()

app = FastAPI(title="Fenix Postgrado", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}

PREFIX="/api/v1"
for r in (auth_router, acceso_router, inscripcion_router, documentos_router, periodos_router, carga_academica_router, graduacion_router, cohortes_router, estadisticas_router):
    app.include_router(r, prefix=PREFIX)

def main() -> None:
    import uvicorn

    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main()
