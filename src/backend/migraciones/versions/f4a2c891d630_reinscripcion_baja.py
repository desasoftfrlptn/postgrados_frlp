"""Permitir una nueva inscripción tras la baja sin borrar el historial."""
from alembic import op

revision = "f4a2c891d630"
down_revision = "eb41a92c06d7"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_legajos_cohorte_dni_sin_baja ON legajos (cohorte_id, dni_pasaporte) WHERE estado <> 'BAJA'")
    op.execute("CREATE INDEX IF NOT EXISTS ix_legajos_correo_normalizado ON legajos (lower(correo_electronico))")
    op.execute("ALTER TABLE legajos DROP CONSTRAINT IF EXISTS uq_legajos_cohorte_dni")
    op.execute("ALTER TABLE legajos DROP CONSTRAINT IF EXISTS legajos_correo_electronico_key")


def downgrade():
    # Si existen reinscripciones, fallar sin borrar datos.
    op.create_unique_constraint("uq_legajos_cohorte_dni", "legajos", ["cohorte_id", "dni_pasaporte"])
    op.create_unique_constraint("legajos_correo_electronico_key", "legajos", ["correo_electronico"])
    op.drop_index("uq_legajos_cohorte_dni_sin_baja", table_name="legajos")
    op.drop_index("ix_legajos_correo_normalizado", table_name="legajos")
