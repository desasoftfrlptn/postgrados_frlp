"""agregar responder_a a notificaciones

Revision ID: 401db50e85e9
Revises: 2e3a4b5c6d71
Create Date: 2026-11-22 13:24:47.997856

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '401db50e85e9'
down_revision: Union[str, None] = '2e3a4b5c6d71'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "notificaciones_conduccion",
        sa.Column("responder_a", sa.String(255), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("notificaciones_conduccion", "responder_a")
