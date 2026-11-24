"""agrega fecha limite de notas a seminarios

Revision ID: 1efc01d96653
Revises: 85b0f489af41
Create Date: 2026-11-10

US-B-005: el docente tiene una fecha límite para cargar las notas finales del seminario.
Migración escrita a mano: el autogenerate detectaba cambios falsos en todas las foreign keys
por el search_path = postgrados, public.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "1efc01d96653"
down_revision: Union[str, Sequence[str], None] = "85b0f489af41"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "seminarios",
        sa.Column("fecha_limite_notas", sa.DateTime(timezone=True), nullable=True),
        schema="postgrados",
    )


def downgrade() -> None:
    op.drop_column("seminarios", "fecha_limite_notas", schema="postgrados")