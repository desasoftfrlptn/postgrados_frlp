"""Trabajos prácticos asociados a estudiantes."""
from alembic import op

revision = "3f4a5b6c7d82"
down_revision = "2e3a4b5c6d71"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""CREATE TABLE IF NOT EXISTS trabajos_practicos (
        id UUID PRIMARY KEY, legajo_id UUID NOT NULL REFERENCES legajos(id) ON DELETE RESTRICT,
        titulo VARCHAR(300) NOT NULL, descripcion TEXT NOT NULL, fecha DATE NOT NULL,
        activo BOOLEAN NOT NULL DEFAULT true, version INTEGER NOT NULL DEFAULT 1)""")
    op.execute("CREATE INDEX IF NOT EXISTS ix_trabajos_practicos_legajo_id ON trabajos_practicos(legajo_id)")


def downgrade():
    op.drop_table("trabajos_practicos")
