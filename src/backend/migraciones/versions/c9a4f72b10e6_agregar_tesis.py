"""Registrar tesis de maestría y doctorado."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "c9a4f72b10e6"
down_revision = "92b7e4c1a603"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "tesis",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("legajo_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("legajos.id", ondelete="RESTRICT"), nullable=False, unique=True),
        sa.Column("titulo", sa.String(300), nullable=False),
        sa.Column("director", sa.String(200), nullable=False),
        sa.Column("codirector", sa.String(200)),
        sa.Column("fecha_aprobacion", sa.Date()),
        sa.Column("numero_resolucion", sa.String(100)),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("actualizado_por", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False),
        sa.CheckConstraint("version >= 1", name="ck_tesis_version"),
        sa.CheckConstraint("(fecha_aprobacion IS NULL) = (numero_resolucion IS NULL)", name="ck_tesis_aprobacion_completa"),
    )


def downgrade():
    op.drop_table("tesis")
