"""Carga datos ficticios para probar localmente la API de Legajos.

Ejecutar desde la raíz del backend:
    uv run python -m scripts.seed

El script es idempotente: utiliza UUID fijos del seed.json y actualiza los
registros de prueba existentes. No crea tablas; primero ejecutar Alembic.

Autenticación: los usuarios se guardan con ``password_hash`` (bcrypt), el mismo
formato que valida ``src.shared.auth.passwords.verificar_contrasena`` en el login.
En el seed.json la contraseña se indica en el campo ``password`` (texto plano,
solo para datos de prueba) y nunca se guarda tal cual.
"""

import asyncio
import json
from datetime import date, datetime
from pathlib import Path
from uuid import UUID

import bcrypt

from src.shared.database.connection import SessionLocal

# Importar todos los modelos para registrar correctamente sus tablas en Base.metadata.
from src.inscripcion.infrastructure.orm_models import (  # noqa: F401
    AuditoriaLegajo,
    Cohorte,
    Legajo,
    PeriodoInscripcion,
)
from src.shared.auth.orm_models import (  # noqa: F401
    ROLES,
    InvitacionCuenta,
    SesionRefresh,
    Usuario,
)
from src.acceso.models import EnlaceAcceso, LimiteSolicitud, SesionAcceso  # noqa: F401


BASE_DIR = Path(__file__).resolve().parent.parent
SEED_FILE = BASE_DIR / "seeds" / "seed.json"

# Columnas válidas de Usuario según el modelo actual (id, nombre, email,
# password_hash, rol, activo, created_at).
CAMPOS_USUARIO = {columna.name for columna in Usuario.__table__.columns}

# bcrypt solo procesa los primeros 72 bytes; las versiones recientes lanzan error.
BCRYPT_MAX_BYTES = 72


def parse_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def parse_datetime(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


def uuid_value(value: str | None) -> UUID | None:
    return UUID(value) if value else None


def hash_password(password: str) -> str:
    """Genera un hash bcrypt compatible con verificar_contrasena()."""
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > BCRYPT_MAX_BYTES:
        raise ValueError(
            f"La contraseña supera el máximo de {BCRYPT_MAX_BYTES} bytes que admite bcrypt."
        )
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


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


async def convertir_usuario(item: dict) -> dict:
    """Prepara un usuario del seed.json para el modelo Usuario actual."""
    datos = dict(item)
    email = datos.get("email", "<sin email>")

    password = datos.pop("password", None)
    datos["id"] = uuid_value(datos["id"])

    # Los roles se guardan en minúscula y la tabla tiene un CHECK que los restringe.
    datos["rol"] = str(datos["rol"]).strip().lower()
    if datos["rol"] not in ROLES:
        raise ValueError(
            f"Rol inválido '{datos['rol']}' para el usuario {email}. "
            f"Roles permitidos: {', '.join(ROLES)}."
        )

    # El login busca por email exacto (solo aplica strip), así que se normaliza igual.
    datos["email"] = datos["email"].strip()

    if password:
        # bcrypt es costoso en CPU: se ejecuta en un hilo para no bloquear el loop.
        datos["password_hash"] = await asyncio.to_thread(hash_password, password)
    elif not datos.get("password_hash"):
        raise ValueError(
            f"El usuario {email} necesita 'password' (o 'password_hash') en el seed: "
            "la columna password_hash no admite nulos."
        )

    desconocidos = set(datos) - CAMPOS_USUARIO
    if desconocidos:
        raise ValueError(
            f"Campos no soportados por el modelo Usuario en {email}: "
            f"{', '.join(sorted(desconocidos))}. "
            f"Campos válidos: {', '.join(sorted(CAMPOS_USUARIO))} (más 'password')."
        )

    if "created_at" in datos:
        datos["created_at"] = parse_datetime(datos["created_at"])

    return datos


async def cargar_seed() -> None:
    if not SEED_FILE.exists():
        raise FileNotFoundError(f"No se encontró el archivo de datos: {SEED_FILE}")

    data = json.loads(SEED_FILE.read_text(encoding="utf-8"))

    # Los hashes se calculan antes de abrir la transacción para no mantenerla
    # abierta mientras bcrypt trabaja.
    usuarios = [await convertir_usuario(item) for item in data.get("usuarios", [])]

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

            # Usuarios antes que legajos: Legajo.usuario_id referencia a usuarios.id.
            for datos in usuarios:
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
    print(f"  Usuarios: {len(usuarios)}")
    print(f"  Legajos: {len(data.get('legajos', []))}")
    print(f"  Auditorías: {len(data.get('auditorias', []))}")
    print("  Cuenta de prueba: estudiante.demo@ejemplo.com")
    print("  Contraseña: EstudianteDemo2026!")


if __name__ == "__main__":
    asyncio.run(cargar_seed())
