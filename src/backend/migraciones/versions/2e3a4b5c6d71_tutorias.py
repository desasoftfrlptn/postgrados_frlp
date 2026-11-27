"""Tutorías y encuentros."""
from alembic import op
revision = "2e3a4b5c6d71"
down_revision = "1e2a3b4c5d60"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""CREATE TABLE IF NOT EXISTS tutorias (
        id UUID PRIMARY KEY, legajo_id UUID NOT NULL UNIQUE REFERENCES legajos(id) ON DELETE RESTRICT,
        tutor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT, activa BOOLEAN NOT NULL DEFAULT true)""")
    op.execute("""CREATE TABLE IF NOT EXISTS encuentros_tutoria (
        id UUID PRIMARY KEY, tutoria_id UUID NOT NULL REFERENCES tutorias(id) ON DELETE RESTRICT,
        autor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT, fecha DATE NOT NULL,
        estado VARCHAR(12) NOT NULL, observaciones TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
        CONSTRAINT ck_encuentro_estado CHECK (estado IN ('PENDIENTE','REALIZADA','CANCELADA')))""")
    op.execute("CREATE INDEX IF NOT EXISTS ix_encuentros_tutoria_tutoria_id ON encuentros_tutoria(tutoria_id)")


def downgrade():
    op.drop_table("encuentros_tutoria")
    op.drop_table("tutorias")
