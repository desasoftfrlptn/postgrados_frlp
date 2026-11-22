"""Alertas persistentes por usuario."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
revision = "eb41a92c06d7"
down_revision = "c9a4f72b10e6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("alertas_usuario",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("titulo", sa.String(160), nullable=False),
        sa.Column("mensaje", sa.Text(), nullable=False),
        sa.Column("ruta", sa.String(250), nullable=False),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("leida_en", sa.DateTime(timezone=True)))
    op.create_index("ix_alertas_usuario_fecha", "alertas_usuario", ["usuario_id", "fecha"])


def downgrade():
    op.drop_table("alertas_usuario")
