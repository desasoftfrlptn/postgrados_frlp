from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b7120ad84e31"
down_revision = "ae29cf7a6102"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "gestion_legajos",
        sa.Column(
            "legajo_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("legajos.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column(
            "numero_legajo",
            sa.String(50),
            nullable=True,
        ),
        sa.Column(
            "datos_verificados",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "tiene_titulo_posgrado",
            sa.Boolean(),
            nullable=True,
        ),
        sa.Column(
            "fecha_aprobacion",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "fecha_matricula",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "fecha_baja",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "observaciones",
            sa.Text(),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "numero_legajo",
            name="uq_gestion_legajos_numero",
        ),
    )

    op.create_table(
        "numeracion_legajos_cohortes",
        sa.Column(
            "id",
            sa.Integer(),
            sa.Identity(),
            primary_key=True,
        ),
        sa.Column(
            "cohorte_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cohortes.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "ultimo_numero",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.UniqueConstraint(
            "cohorte_id",
            name="uq_numeracion_legajos_cohorte",
        ),
    )

    op.create_table(
        "auditoria_conduccion",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            "actor_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "actor_rol",
            sa.String(50),
            nullable=False,
        ),
        sa.Column(
            "recurso_tipo",
            sa.String(50),
            nullable=False,
        ),
        sa.Column(
            "recurso_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "accion",
            sa.String(80),
            nullable=False,
        ),
        sa.Column(
            "resultado",
            sa.String(30),
            nullable=False,
        ),
        sa.Column(
            "anterior",
            sa.JSON(),
            nullable=True,
        ),
        sa.Column(
            "nuevo",
            sa.JSON(),
            nullable=True,
        ),
        sa.Column(
            "comentario",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "fecha",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_index(
        "ix_auditoria_conduccion_actor_id",
        "auditoria_conduccion",
        ["actor_id"],
    )

    op.create_index(
        "ix_auditoria_conduccion_recurso_id",
        "auditoria_conduccion",
        ["recurso_id"],
    )

    op.create_table(
        "notificaciones_conduccion",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            "destinatario",
            sa.String(255),
            nullable=False,
        ),
        sa.Column(
            "asunto",
            sa.String(200),
            nullable=False,
        ),
        sa.Column(
            "contenido",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "enviado",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "intentos",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "ultimo_error",
            sa.String(200),
            nullable=True,
        ),
        sa.Column(
            "fecha_creacion",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "fecha_envio",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_table("notificaciones_conduccion")

    op.drop_index(
        "ix_auditoria_conduccion_recurso_id",
        table_name="auditoria_conduccion",
    )

    op.drop_index(
        "ix_auditoria_conduccion_actor_id",
        table_name="auditoria_conduccion",
    )

    op.drop_table("auditoria_conduccion")
    op.drop_table("numeracion_legajos_cohortes")
    op.drop_table("gestion_legajos")