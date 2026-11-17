"""Agrega credenciales de acceso del aspirante a su legajo."""

import sqlalchemy as sa
from alembic import op

revision = "20261116_0007"
down_revision = "20261116_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "legajos",
        sa.Column("token_propietario_hash", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "legajos",
        sa.Column(
            "token_propietario_expira_en",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_unique_constraint(
        "uq_legajos_token_propietario_hash",
        "legajos",
        ["token_propietario_hash"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_legajos_token_propietario_hash",
        "legajos",
        type_="unique",
    )
    op.drop_column("legajos", "token_propietario_expira_en")
    op.drop_column("legajos", "token_propietario_hash")
