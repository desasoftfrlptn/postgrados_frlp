"""unificar migraciones de notificaciones y legajo personal

Revision ID: c735b7d99a01
Revises: 401db50e85e9, 5b6c7d8e9f04
Create Date: 2026-11-24 04:35:18.865673

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c735b7d99a01'
down_revision: Union[str, None] = ('401db50e85e9', '5b6c7d8e9f04')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
