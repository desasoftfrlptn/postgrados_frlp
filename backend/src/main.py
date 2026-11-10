from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager

from src.inscripcion.presentation.controller import router as inscripcion_router
from src.acceso.controllers.controller import router as acceso_router
from src.shared.auth.router import router as auth_router

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
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)

@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}

PREFIX="/api/v1"
for r in (auth_router, acceso_router, inscripcion_router):
    app.include_router(r, prefix=PREFIX)

def main() -> None:
    import uvicorn

    uvicorn.run("src.main:app", host="127.0.0.1", port=8000, reload=False)


if __name__ == "__main__":
    main()