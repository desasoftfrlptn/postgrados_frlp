from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from src.core.config import settings


def test_migracion_docentes_desde_0009_y_reversion(tmp_path: Path, monkeypatch) -> None:
    url = f"sqlite:///{tmp_path / 'migracion.db'}"
    motor = create_engine(url)
    with motor.begin() as conexion:
        conexion.execute(text("CREATE TABLE cohortes (id CHAR(32) PRIMARY KEY)"))
        conexion.execute(text("CREATE TABLE legajos (id CHAR(32) PRIMARY KEY)"))
        conexion.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)"))
        conexion.execute(text("INSERT INTO alembic_version VALUES ('20261116_0009')"))

    carpeta_backend = Path(__file__).resolve().parents[1]
    configuracion = Config(str(carpeta_backend / "alembic.ini"))
    configuracion.set_main_option("script_location", str(carpeta_backend / "alembic"))
    monkeypatch.setattr(settings, "database_url", url)

    command.upgrade(configuracion, "head")
    assert {"seminarios", "inscripciones_seminario", "accesos_docente"} <= set(inspect(motor).get_table_names())
    with motor.connect() as conexion:
        assert conexion.scalar(text("SELECT version_num FROM alembic_version")) == "20261117_0010"
    command.downgrade(configuracion, "20261116_0009")
    assert "seminarios" not in inspect(motor).get_table_names()
    motor.dispose()
