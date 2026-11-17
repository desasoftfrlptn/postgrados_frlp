"""Crea las tablas de seminarios y carga académica."""

import sqlalchemy as sa
from alembic import op

revision = "20261116_0008"
down_revision = "20261116_0007"
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
        sa.Column("fecha_limite_notas", sa.DateTime(timezone=True)),
        sa.Column("ultimo_recordatorio_en", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "accesos_docente",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("seminario_id", sa.Uuid(), sa.ForeignKey("seminarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_accesos_docente_seminario_id", "accesos_docente", ["seminario_id"])
    op.create_table(
        "inscripciones_seminario",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("seminario_id", sa.Uuid(), sa.ForeignKey("seminarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("legajo_id", sa.Uuid(), sa.ForeignKey("legajos.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("nota", sa.Numeric(3, 1)),
        sa.UniqueConstraint("seminario_id", "legajo_id", name="uq_inscripcion_seminario_legajo"),
        sa.CheckConstraint("nota IS NULL OR (nota >= 1 AND nota <= 10)", name="ck_nota_seminario"),
    )
    op.create_index("ix_inscripciones_seminario_seminario_id", "inscripciones_seminario", ["seminario_id"])
    op.create_index("ix_inscripciones_seminario_legajo_id", "inscripciones_seminario", ["legajo_id"])
    op.create_table(
        "clases_seminario",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("seminario_id", sa.Uuid(), sa.ForeignKey("seminarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.UniqueConstraint("seminario_id", "fecha", name="uq_clase_seminario_fecha"),
    )
    op.create_index("ix_clases_seminario_seminario_id", "clases_seminario", ["seminario_id"])
    op.create_table(
        "asistencias_seminario",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("clase_id", sa.Uuid(), sa.ForeignKey("clases_seminario.id", ondelete="CASCADE"), nullable=False),
        sa.Column("inscripcion_id", sa.Uuid(), sa.ForeignKey("inscripciones_seminario.id", ondelete="CASCADE"), nullable=False),
        sa.Column("presente", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("clase_id", "inscripcion_id", name="uq_asistencia_clase_inscripcion"),
    )
    op.create_index("ix_asistencias_seminario_clase_id", "asistencias_seminario", ["clase_id"])
    op.create_index("ix_asistencias_seminario_inscripcion_id", "asistencias_seminario", ["inscripcion_id"])


def downgrade() -> None:
    op.drop_table("asistencias_seminario")
    op.drop_table("clases_seminario")
    op.drop_table("inscripciones_seminario")
    op.drop_table("accesos_docente")
    op.drop_table("seminarios")
