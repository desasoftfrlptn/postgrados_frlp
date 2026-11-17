"""Inspecciona la base configurada sin modificar datos ni mostrar credenciales."""

import asyncio
import json
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine


async def main():
    load_dotenv(Path(__file__).resolve().parent / ".env")
    from src.compartido.conexion import DATABASE_URL

    engine = create_async_engine(DATABASE_URL, echo=False)
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SET TRANSACTION READ ONLY"))
            identity = (await connection.execute(text(
                "SELECT current_database() AS base, current_schema() AS esquema, "
                "current_setting('search_path') AS search_path"
            ))).mappings().one()
            print(json.dumps(dict(identity), ensure_ascii=False))
            print(f"Servidor: {engine.url.host}:{engine.url.port}")

            def inspect_schema(sync_connection):
                inspector = inspect(sync_connection)
                result = {}
                for table in inspector.get_table_names():
                    result[table] = {
                        "columnas": [
                            {"nombre": c["name"], "tipo": str(c["type"]),
                             "nullable": c["nullable"]}
                            for c in inspector.get_columns(table)
                        ],
                        "unicos": inspector.get_unique_constraints(table),
                        "foraneas": inspector.get_foreign_keys(table),
                    }
                return result

            schema = await connection.run_sync(inspect_schema)
            print(json.dumps(schema, ensure_ascii=False, default=str, indent=2))
            if "alembic_version" in schema:
                versions = (await connection.execute(
                    text("SELECT version_num FROM alembic_version")
                )).scalars().all()
                print("Revisiones:", versions)
            if "legajos" in schema:
                count = (await connection.execute(
                    text("SELECT COUNT(*) FROM legajos")
                )).scalar_one()
                print("Cantidad de legajos:", count)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
