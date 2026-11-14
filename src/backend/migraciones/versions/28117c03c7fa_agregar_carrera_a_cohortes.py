from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '28117c03c7fa'
down_revision: Union[str, None] = '13384ecb52cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade() -> None:
    op.add_column(
        "cohortes",
        sa.Column(
            "carrera_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_cohortes_carrera_id",
        "cohortes",
        "carreras",
        ["carrera_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_cohortes_carrera_id",
        "cohortes",
        type_="foreignkey",
    )

    op.drop_column(
        "cohortes",
        "carrera_id",
    )
