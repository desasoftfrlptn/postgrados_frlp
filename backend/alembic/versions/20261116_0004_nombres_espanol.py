"""Traduce al espanol los nombres de las tablas compartidas."""

import sqlalchemy as sa
from alembic import op

revision = "20261116_0004"
down_revision = "20261116_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_audit_events_resource", table_name="audit_events")
    op.drop_index("ix_audit_events_created_at", table_name="audit_events")
    op.rename_table("audit_events", "eventos_auditoria")
    op.alter_column("eventos_auditoria", "actor_id", new_column_name="id_actor")
    op.alter_column("eventos_auditoria", "actor_role", new_column_name="rol_actor")
    op.alter_column("eventos_auditoria", "action", new_column_name="accion")
    op.alter_column("eventos_auditoria", "resource_type", new_column_name="tipo_recurso")
    op.alter_column("eventos_auditoria", "resource_id", new_column_name="id_recurso")
    op.alter_column("eventos_auditoria", "details", new_column_name="detalles")
    op.alter_column("eventos_auditoria", "created_at", new_column_name="creado_en")
    op.create_index(
        "ix_eventos_auditoria_recurso",
        "eventos_auditoria",
        ["tipo_recurso", "id_recurso"],
    )
    op.create_index(
        "ix_eventos_auditoria_creado_en",
        "eventos_auditoria",
        ["creado_en"],
    )

    op.drop_constraint(
        "uq_rate_limit_key_window",
        "rate_limit_buckets",
        type_="unique",
    )
    op.rename_table("rate_limit_buckets", "contadores_limite_solicitudes")
    op.alter_column(
        "contadores_limite_solicitudes",
        "key_hash",
        new_column_name="hash_clave",
    )
    op.alter_column(
        "contadores_limite_solicitudes",
        "window_start",
        new_column_name="inicio_ventana",
    )
    op.alter_column(
        "contadores_limite_solicitudes",
        "count",
        new_column_name="cantidad",
    )
    op.create_unique_constraint(
        "uq_contador_limite_clave_ventana",
        "contadores_limite_solicitudes",
        ["hash_clave", "inicio_ventana"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_contador_limite_clave_ventana",
        "contadores_limite_solicitudes",
        type_="unique",
    )
    op.alter_column(
        "contadores_limite_solicitudes",
        "cantidad",
        new_column_name="count",
    )
    op.alter_column(
        "contadores_limite_solicitudes",
        "inicio_ventana",
        new_column_name="window_start",
    )
    op.alter_column(
        "contadores_limite_solicitudes",
        "hash_clave",
        new_column_name="key_hash",
    )
    op.rename_table("contadores_limite_solicitudes", "rate_limit_buckets")
    op.create_unique_constraint(
        "uq_rate_limit_key_window",
        "rate_limit_buckets",
        ["key_hash", "window_start"],
    )

    op.drop_index(
        "ix_eventos_auditoria_creado_en",
        table_name="eventos_auditoria",
    )
    op.drop_index(
        "ix_eventos_auditoria_recurso",
        table_name="eventos_auditoria",
    )
    op.rename_table("eventos_auditoria", "audit_events")
    op.alter_column("audit_events", "id_actor", new_column_name="actor_id")
    op.alter_column("audit_events", "rol_actor", new_column_name="actor_role")
    op.alter_column("audit_events", "accion", new_column_name="action")
    op.alter_column("audit_events", "tipo_recurso", new_column_name="resource_type")
    op.alter_column("audit_events", "id_recurso", new_column_name="resource_id")
    op.alter_column("audit_events", "detalles", new_column_name="details")
    op.alter_column("audit_events", "creado_en", new_column_name="created_at")
    op.create_index(
        "ix_audit_events_resource",
        "audit_events",
        ["resource_type", "resource_id"],
    )
    op.create_index(
        "ix_audit_events_created_at",
        "audit_events",
        ["created_at"],
    )
