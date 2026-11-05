from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.shared.database.connection import crear_todas_las_tablas, get_db

# Importar routers de todos los módulos
from src.inscripcion.presentation.router import router as router_inscripcion
from src.carga_academica.presentation.router import router as router_carga_academica
from src.seguimiento_graduacion.presentation.router import router as router_seguimiento
from src.analytics.presentation.router import router as router_analytics
from src.gestion_documental.presentation.router import router as router_documental

app = FastAPI(
    title="Sistema de Posgrado - Backend",
    description="API REST para la gestión académica de posgrado UTN FRLP",
    version="0.1.0",
    docs_url="/api/docs",  # Swagger UI
    redoc_url="/api/redoc",
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers de todos los módulos
app.include_router(
    router_inscripcion,
    prefix="/api/v1/legajos",
    tags=["Legajos - Módulo Core"],
)
app.include_router(
    router_carga_academica,
    prefix="/api/v1/seminarios",
    tags=["Carga Académica - Módulo B"],
)
app.include_router(
    router_seguimiento,
    prefix="/api/v1/graduacion",
    tags=["Seguimiento de Graduación - Módulo C"],
)
app.include_router(
    router_analytics,
    prefix="/api/v1/analytics",
    tags=["Analytics - Módulo D"],
)
app.include_router(
    router_documental,
    prefix="/api/v1/documentos",
    tags=["Gestión Documental"],
)


@app.on_event("startup")
async def startup_event():
    """Eventos que se ejecutan al iniciar la aplicación."""
    # Crear tablas de base de datos si no existen
    # En producción esto se hace mediante migraciones Alembic
    # await crear_todas_las_tablas()
    print("🚀 Sistema de Posgrado Backend iniciado")


@app.get("/", tags=["Root"])
async def read_root():
    """Endpoint raíz para verificación de salud."""
    return {
        "mensaje": "Sistema de Posgrado API",
        "version": "0.1.0",
        "estado": "operativo",
        "documentacion": "/api/docs",
    }


# Endpoints de autenticación simples (placeholder)
@app.post("/api/v1/auth/login", tags=["Autenticación"])
async def login(
        # En un sistema real recibirían email/contraseña y verificarían contra BD
) -> Dict[str, str]:
    """Endpoint de login placeholder."""
    return {"access_token": "token-placeholder", "token_type": "bearer"}


@app.get("/api/v1/health", tags=["Health"])
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}
