"""Amplía la carga académica con clases, asistencia y notas."""

import sqlalchemy as sa
from alembic import op

revision = "20261117_0011"
down_revision = "20261117_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("seminarios", sa.Column("carrera", sa.String(30), nullable=True))
    op.add_column("seminarios", sa.Column("es_obligatorio", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("seminarios", sa.Column("fecha_limite_notas", sa.DateTime(timezone=True), nullable=True))
    op.add_column("seminarios", sa.Column("ultimo_recordatorio_en", sa.DateTime(timezone=True), nullable=True))
    op.add_column("inscripciones_seminario", sa.Column("nota", sa.Numeric(3, 1), nullable=True))
    op.add_column("inscripciones_seminario", sa.Column("ultimo_avance_en", sa.DateTime(timezone=True), nullable=True))
    with op.batch_alter_table("inscripciones_seminario") as lote:
        lote.create_check_constraint("ck_nota_seminario", "nota IS NULL OR (nota >= 1 AND nota <= 10)")
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
    with op.batch_alter_table("inscripciones_seminario") as lote:
        lote.drop_constraint("ck_nota_seminario", type_="check")
        lote.drop_column("nota")
        lote.drop_column("ultimo_avance_en")
    op.drop_column("seminarios", "ultimo_recordatorio_en")
    op.drop_column("seminarios", "fecha_limite_notas")
    op.drop_column("seminarios", "es_obligatorio")
    op.drop_column("seminarios", "carrera")
