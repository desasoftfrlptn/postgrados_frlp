"""unicidad dni por cohorte

Revision ID: 59e9f887c7ec
Revises: 28117c03c7fa
Create Date: 2026-11-13 22:49:19.391767

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '59e9f887c7ec'
down_revision: Union[str, None] = '28117c03c7fa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    op.create_unique_constraint(
        "uq_legajos_cohorte_dni",
        "legajos",
        ["cohorte_id", "dni_pasaporte"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_legajos_cohorte_dni",
        "legajos",
        type_="unique",
    )
