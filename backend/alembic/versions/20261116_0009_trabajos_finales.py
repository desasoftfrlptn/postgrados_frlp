"""Crea la tabla de trabajos finales vinculados a legajos."""

import sqlalchemy as sa
from alembic import op

revision = "20261116_0009"
down_revision = "20261116_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trabajos_finales",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "legajo_id",
            sa.Uuid(),
            sa.ForeignKey("legajos.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("titulo", sa.String(500), nullable=False),
        sa.Column("director_nombre", sa.String(200), nullable=False),
        sa.Column("director_email", sa.String(254), nullable=False),
        sa.Column("codirector", sa.String(200), nullable=True),
        sa.Column("fecha_aprobacion_cpr", sa.Date(), nullable=False),
        sa.Column("numero_resolucion", sa.String(100), nullable=False),
        sa.CheckConstraint(
            "tipo IN ('TFI', 'Maestría', 'Doctorado')",
            name="ck_trabajos_finales_tipo",
        ),
    )
    op.create_index("ix_trabajos_finales_legajo_id", "trabajos_finales", ["legajo_id"])


def downgrade() -> None:
    op.drop_index("ix_trabajos_finales_legajo_id", table_name="trabajos_finales")
    op.drop_table("trabajos_finales")
