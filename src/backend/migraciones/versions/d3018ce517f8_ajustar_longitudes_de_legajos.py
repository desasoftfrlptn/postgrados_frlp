"""ajustar longitudes de legajos

Revision ID: d3018ce517f8
Revises: 59e9f887c7ec
Create Date: 2026-11-13 22:58:02.308190

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3018ce517f8'
down_revision: Union[str, None] = '59e9f887c7ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    op.alter_column(
        "legajos",
        "carrera_elegida",
        existing_type=sa.String(length=20),
        type_=sa.String(length=200),
        existing_nullable=False,
    )

    op.alter_column(
        "legajos",
        "domicilio",
        existing_type=sa.String(length=100),
        type_=sa.String(length=255),
        existing_nullable=False,
    )

    op.alter_column(
        "legajos",
        "correo_alternativo",
        existing_type=sa.String(length=100),
        type_=sa.String(length=255),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "legajos",
        "correo_alternativo",
        existing_type=sa.String(length=255),
        type_=sa.String(length=100),
        existing_nullable=False,
    )

    op.alter_column(
        "legajos",
        "domicilio",
        existing_type=sa.String(length=255),
        type_=sa.String(length=100),
        existing_nullable=False,
    )

    op.alter_column(
        "legajos",
        "carrera_elegida",
        existing_type=sa.String(length=200),
        type_=sa.String(length=20),
        existing_nullable=False,
    )
