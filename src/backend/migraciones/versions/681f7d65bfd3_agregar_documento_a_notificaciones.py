"""Agregar documento a notificaciones.

Revision ID: 681f7d65bfd3
Revises: ffb6ec574eb0
"""

from alembic import op
import sqlalchemy as sa

revision = "681f7d65bfd3"
down_revision = "ffb6ec574eb0"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())

    columnas_gestion = {
        columna["name"]
        for columna in inspector.get_columns("gestion_legajos")
    }

    if "documentacion_a_corregir" not in columnas_gestion:
        op.add_column(
            "gestion_legajos",
            sa.Column(
                "documentacion_a_corregir",
                sa.JSON(),
                nullable=False,
                server_default=sa.text("'[]'"),
            ),
        )

    columnas_notificaciones = {
        columna["name"]
        for columna in inspector.get_columns(
            "notificaciones_conduccion"
        )
    }

    if "documento_id" not in columnas_notificaciones:
        op.add_column(
            "notificaciones_conduccion",
            sa.Column(
                "documento_id",
                sa.UUID(),
                nullable=True,
            ),
        )

    claves = {
        clave["name"]
        for clave in inspector.get_foreign_keys(
            "notificaciones_conduccion"
        )
    }

    if "fk_notificacion_documento" not in claves:
        op.create_foreign_key(
            "fk_notificacion_documento",
            "notificaciones_conduccion",
            "documentos_legajo",
            ["documento_id"],
            ["id"],
            ondelete="RESTRICT",
        )


def downgrade():
    op.drop_constraint(
        "fk_notificacion_documento",
        "notificaciones_conduccion",
        type_="foreignkey",
    )

    op.drop_column(
        "notificaciones_conduccion",
        "documento_id",
    )
