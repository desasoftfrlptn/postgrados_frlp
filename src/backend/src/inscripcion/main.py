from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.autenticacion.presentacion import rutas as rutas_auth
from src.inscripcion.presentacion import rutas as rutas_inscripcion

app = FastAPI(title="API Postgrados FRLP")

# 1. Configuración de CORS
origenes_permitidos = [
    "http://localhost:3000",  
    "http://localhost:5173",  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_permitidos,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# 2. Inclusión de Rutas
app.include_router(rutas_auth.router)
app.include_router(rutas_inscripcion.router)

@app.get("/")
def health_check():
    return {"estado": "API funcionando correctamente"}
