"""Agregar cohorte a legajos.

Revision ID: 13384ecb52cf
Revises: ba943565c5d1
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "13384ecb52cf"
down_revision = "ba943565c5d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "legajos",
        sa.Column(
            "cohorte_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_legajos_cohorte_id",
        "legajos",
        "cohortes",
        ["cohorte_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_legajos_cohorte_id",
        "legajos",
        type_="foreignkey",
    )

    op.drop_column(
        "legajos",
        "cohorte_id",
    )
