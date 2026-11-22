"""agregar documento a notificaciones

Revision ID: 681f7d65bfd3
Revises: ffb6ec574eb0
Create Date: 2026-11-22 01:48:39.567248

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '681f7d65bfd3'
down_revision: Union[str, None] = 'ffb6ec574eb0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
