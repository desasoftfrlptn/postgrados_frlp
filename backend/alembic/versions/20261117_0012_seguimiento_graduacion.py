"""Crea planes, semáforos y alertas de graduación."""

import sqlalchemy as sa
from alembic import op

revision = "20261117_0012"
down_revision = "20261117_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "planes_graduacion",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("cohorte_id", sa.Uuid(), sa.ForeignKey("cohortes.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("carrera", sa.String(30), nullable=False),
        sa.Column("confirmado", sa.Boolean(), nullable=False),
        sa.Column("requiere_recalculo", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("cohorte_id", "carrera", name="uq_plan_graduacion_cohorte_carrera"),
    )
    op.create_table(
        "asignaciones_coordinador_carrera",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("carrera", sa.String(30), nullable=False),
        sa.Column("usuario_id", sa.Uuid(), sa.ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False),
        sa.UniqueConstraint("carrera", "usuario_id", name="uq_coordinador_carrera"),
    )
    op.create_table(
        "avances_tesis",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("legajo_id", sa.Uuid(), sa.ForeignKey("legajos.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("carrera", sa.String(30), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("descripcion", sa.String(1000), nullable=False),
    )
    op.create_index("ix_avances_tesis_legajo_id", "avances_tesis", ["legajo_id"])
    op.create_table(
        "semaforos_graduacion",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("legajo_id", sa.Uuid(), sa.ForeignKey("legajos.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("carrera", sa.String(30), nullable=False),
        sa.Column("estado", sa.String(10), nullable=False),
        sa.Column("motivo", sa.String(250), nullable=False),
        sa.Column("seminarios_adeudados", sa.Integer(), nullable=False),
        sa.Column("fecha_ultimo_avance", sa.Date(), nullable=False),
        sa.Column("fecha_cambio", sa.DateTime(timezone=True), nullable=False),
        sa.Column("recalculado_en", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("legajo_id", "carrera", name="uq_semaforo_legajo_carrera"),
        sa.CheckConstraint("estado IN ('VERDE', 'AMARILLO', 'ROJO')", name="ck_semaforo_estado"),
    )
    op.create_index("ix_semaforos_graduacion_legajo_id", "semaforos_graduacion", ["legajo_id"])
    op.create_index("ix_semaforos_estado", "semaforos_graduacion", ["estado"])
    op.create_table(
        "alertas_riesgo",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("semaforo_id", sa.Uuid(), sa.ForeignKey("semaforos_graduacion.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("motivo", sa.String(250), nullable=False),
        sa.Column("dias_restantes", sa.Integer(), nullable=False),
        sa.Column("destinatarios_definidos", sa.Boolean(), nullable=False),
        sa.Column("creada_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "entregas_alerta_riesgo",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("alerta_id", sa.Uuid(), sa.ForeignKey("alertas_riesgo.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("usuario_id", sa.Uuid(), sa.ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("enviado_en", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("alerta_id", "usuario_id", name="uq_entrega_alerta_usuario"),
    )
    op.create_index("ix_entregas_alerta_riesgo_alerta_id", "entregas_alerta_riesgo", ["alerta_id"])


def downgrade() -> None:
    op.drop_table("entregas_alerta_riesgo")
    op.drop_table("alertas_riesgo")
    op.drop_table("semaforos_graduacion")
    op.drop_table("avances_tesis")
    op.drop_table("asignaciones_coordinador_carrera")
    op.drop_table("planes_graduacion")
