"""agregar_documentacion_a_corregir

Revision ID: ffb6ec574eb0
Revises: b7120ad84e31
Create Date: 2026-11-20 21:59:30.261049

"""

from alembic import op
import sqlalchemy as sa

revision = "ffb6ec574eb0"
down_revision = "b7120ad84e31"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "notificaciones_conduccion",
        sa.Column("documento_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_notificacion_documento",
        "notificaciones_conduccion",
        "documentos_legajo",
        ["documento_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade():
    op.drop_constraint(
        "fk_notificacion_documento",
        "notificaciones_conduccion",
        type_="foreignkey",
    )
    op.drop_column("notificaciones_conduccion", "documento_id")
