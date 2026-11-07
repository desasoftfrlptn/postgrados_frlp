"""Carga datos ficticios para probar localmente la API de Legajos.

Ejecutar desde la raíz del backend:
    uv run python -m scripts.seed

El script es idempotente: utiliza UUID fijos del seed.json y actualiza los
registros de prueba existentes. No crea tablas; primero ejecutar Alembic.
"""

import asyncio
import json
from datetime import date, datetime
from pathlib import Path
from uuid import UUID

from app.shared.database.connection import SessionLocal
from app.shared.security.tokens import hash_password

# Importar todos los modelos para registrar correctamente sus tablas en Base.metadata.
from app.inscripcion.infrastructure.orm_models import (  # noqa: F401
    AuditoriaLegajo,
    Cohorte,
    Legajo,
    PeriodoInscripcion,
)
from app.usuarios.models import Usuario
from app.acceso.models import EnlaceAcceso, LimiteSolicitud, SesionAcceso  # noqa: F401


BASE_DIR = Path(__file__).resolve().parent.parent
SEED_FILE = BASE_DIR / "seeds" / "seed.json"


def parse_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def parse_datetime(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


def uuid_value(value: str | None) -> UUID | None:
    return UUID(value) if value else None


def convertir_registro(datos: dict, campos_uuid: tuple[str, ...],
                       campos_date: tuple[str, ...] = (),
                       campos_datetime: tuple[str, ...] = ()) -> dict:
    registro = dict(datos)
    for campo in campos_uuid:
        registro[campo] = uuid_value(registro.get(campo))
    for campo in campos_date:
        registro[campo] = parse_date(registro.get(campo))
    for campo in campos_datetime:
        registro[campo] = parse_datetime(registro.get(campo))
    return registro


async def cargar_seed() -> None:
    if not SEED_FILE.exists():
        raise FileNotFoundError(f"No se encontró el archivo de datos: {SEED_FILE}")

    data = json.loads(SEED_FILE.read_text(encoding="utf-8"))

    async with SessionLocal() as db:
        # Una sola transacción: ante cualquier error no queda una carga parcial.
        async with db.begin():
            for item in data.get("cohortes", []):
                datos = convertir_registro(
                    item, ("id",), campos_date=("fecha_inicio",)
                )
                await db.merge(Cohorte(**datos))

            for item in data.get("periodos_inscripcion", []):
                datos = convertir_registro(
                    item, ("id", "cohorte_id"),
                    campos_date=("fecha_abre", "fecha_cierra"),
                )
                await db.merge(PeriodoInscripcion(**datos))

            for item in data.get("usuarios", []):
                datos = dict(item)
                password = datos.pop("password", None)
                datos["id"] = uuid_value(datos["id"])
                datos["rol"] = datos["rol"].lower()
                if password:
                    datos["password_hash"] = hash_password(password)
                await db.merge(Usuario(**datos))

            for item in data.get("legajos", []):
                datos = convertir_registro(
                    item,
                    ("id", "cohorte_id", "usuario_id"),
                    campos_datetime=("fecha_inscripcion", "fecha_activacion"),
                )
                await db.merge(Legajo(**datos))

            for item in data.get("auditorias", []):
                datos = convertir_registro(
                    item, ("id", "legajo_id")
                )
                await db.merge(AuditoriaLegajo(**datos))

    print("Seed cargado correctamente.")
    print(f"  Cohortes: {len(data.get('cohortes', []))}")
    print(f"  Períodos: {len(data.get('periodos_inscripcion', []))}")
    print(f"  Usuarios: {len(data.get('usuarios', []))}")
    print(f"  Legajos: {len(data.get('legajos', []))}")
    print(f"  Auditorías: {len(data.get('auditorias', []))}")
    print("  Cuenta de prueba: estudiante.demo@ejemplo.com")
    print("  Contraseña: EstudianteDemo2026!")


if __name__ == "__main__":
    asyncio.run(cargar_seed())
