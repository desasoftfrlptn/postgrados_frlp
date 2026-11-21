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
        "gestion_legajos",
        sa.Column(
            "documentacion_a_corregir",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )


def downgrade():
    op.drop_column(
        "gestion_legajos",
        "documentacion_a_corregir",
    )
