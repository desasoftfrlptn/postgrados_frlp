"""Crea seminarios, inscripciones y accesos de docentes."""

import sqlalchemy as sa
from alembic import op

revision = "20261117_0010"
down_revision = "20261116_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "seminarios",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("cohorte_id", sa.Uuid(), sa.ForeignKey("cohortes.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("docente_nombre", sa.String(200), nullable=False),
        sa.Column("docente_email", sa.String(254), nullable=False),
        sa.Column("fecha_fin_cuatrimestre", sa.Date(), nullable=False),
    )
    op.create_table(
        "inscripciones_seminario",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("seminario_id", sa.Uuid(), sa.ForeignKey("seminarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("legajo_id", sa.Uuid(), sa.ForeignKey("legajos.id", ondelete="RESTRICT"), nullable=False),
        sa.UniqueConstraint("seminario_id", "legajo_id", name="uq_inscripcion_seminario_legajo"),
    )
    op.create_index("ix_inscripciones_seminario_seminario_id", "inscripciones_seminario", ["seminario_id"])
    op.create_index("ix_inscripciones_seminario_legajo_id", "inscripciones_seminario", ["legajo_id"])
    op.create_table(
        "accesos_docente",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("seminario_id", sa.Uuid(), sa.ForeignKey("seminarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_accesos_docente_seminario_id", "accesos_docente", ["seminario_id"])


def downgrade() -> None:
    op.drop_table("accesos_docente")
    op.drop_table("inscripciones_seminario")
    op.drop_table("seminarios")
