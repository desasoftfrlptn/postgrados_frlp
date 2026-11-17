"""Agrega la fecha prevista de reapertura de inscripcion por cohorte."""

import sqlalchemy as sa
from alembic import op

revision = "20261116_0006"
down_revision = "20261116_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "cohortes",
        sa.Column("fecha_proxima_apertura", sa.Date(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("cohortes", "fecha_proxima_apertura")
