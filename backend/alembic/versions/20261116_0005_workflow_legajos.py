"""Agrega datos para el flujo de correccion de legajos observados."""

import sqlalchemy as sa
from alembic import op

revision = "20261116_0005"
down_revision = "20261116_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "legajos",
        sa.Column("token_correccion_hash", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "legajos",
        sa.Column(
            "token_correccion_expira_en",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("legajos", "token_correccion_expira_en")
    op.drop_column("legajos", "token_correccion_hash")