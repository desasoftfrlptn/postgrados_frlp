"""Permite retirar cuentas conservando sus registros académicos."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "4a5b6c7d8e93"
down_revision = "3f4a5b6c7d82"
branch_labels = None
depends_on = None

RELACIONES = (
    ("seminarios", "docente_id"),
    ("tutorias", "tutor_id"),
    ("encuentros_tutoria", "autor_id"),
    ("tesis", "actualizado_por"),
)


def cambiar_relacion(tabla, columna, nullable, ondelete):
    inspector = sa.inspect(op.get_bind())
    claves = [fk for fk in inspector.get_foreign_keys(tabla)
              if fk["constrained_columns"] == [columna]
              and fk["referred_table"] == "usuarios" and fk["referred_columns"] == ["id"]]
    if len(claves) != 1 or not claves[0]["name"]:
        raise RuntimeError(f"No se pudo identificar la relación {tabla}.{columna}.")
    nombre = claves[0]["name"]
    op.drop_constraint(nombre, tabla, type_="foreignkey")
    op.alter_column(tabla, columna, existing_type=postgresql.UUID(as_uuid=True), nullable=nullable)
    op.create_foreign_key(nombre, tabla, "usuarios", [columna], ["id"], ondelete=ondelete)


def upgrade():
    for tabla, columna in RELACIONES:
        cambiar_relacion(tabla, columna, True, "SET NULL")


def downgrade():
    for tabla, columna in RELACIONES:
        if op.get_bind().execute(sa.text(f"SELECT EXISTS (SELECT 1 FROM {tabla} WHERE {columna} IS NULL)")).scalar_one():
            raise RuntimeError("No se puede revertir: existen registros sin usuario asociado.")
    for tabla, columna in RELACIONES:
        cambiar_relacion(tabla, columna, False, "RESTRICT")
