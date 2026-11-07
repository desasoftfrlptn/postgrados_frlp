from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager

from app.inscripcion.presentation.controller import router as inscripcion_router
from app.acceso.controllers.controller import router as acceso_router
from app.usuarios.controllers.controller import router as usuarios_router

from app.config import CORS_ORIGINS

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

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
for r in (usuarios_router, acceso_router, inscripcion_router):
    app.include_router(r, prefix=PREFIX)

def main() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)


if __name__ == "__main__":
    main()