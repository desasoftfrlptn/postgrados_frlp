import asyncio

from dotenv import load_dotenv

# Carga DATABASE_URL desde .env antes de importar la conexión.
load_dotenv()

from sqlalchemy import select

from src.autenticacion.infraestructura.orm_modelos import RolORM
from src.compartido.conexion import AsyncSessionLocal, engine


ROLES = (
    "ASPIRANTE",
    "DOCENTE",
    "COORDINADOR",
    "CPR",
    "ADMIN",
)


async def cargar_roles() -> None:
    try:
        async with AsyncSessionLocal() as session:
            resultado = await session.scalars(select(RolORM.nombre))
            existentes = set(resultado.all())

            nuevos = [
                RolORM(nombre=nombre)
                for nombre in ROLES
                if nombre not in existentes
            ]

            session.add_all(nuevos)
            await session.commit()

            resultado = await session.scalars(
                select(RolORM.nombre).order_by(RolORM.nombre)
            )
            roles_guardados = resultado.all()

            print(f"Roles agregados en esta ejecución: {len(nuevos)}")
            print("Roles en la base:", ", ".join(roles_guardados))
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(cargar_roles())