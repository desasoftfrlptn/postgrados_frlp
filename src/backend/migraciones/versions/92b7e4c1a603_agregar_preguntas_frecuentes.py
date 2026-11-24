"""Agregar preguntas frecuentes administrables.

Revision ID: 92b7e4c1a603
Revises: 681f7d65bfd3
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "92b7e4c1a603"
down_revision = "681f7d65bfd3"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "preguntas_frecuentes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "categoria",
            sa.String(100),
            nullable=False,
        ),
        sa.Column(
            "pregunta",
            sa.String(300),
            nullable=False,
        ),
        sa.Column(
            "respuesta",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "orden",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "activa",
            sa.Boolean(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "orden >= 1",
            name="ck_preguntas_frecuentes_orden",
        ),
    )


def downgrade():
    op.drop_table("preguntas_frecuentes")
