"""Permite marcar archivos como faltantes sin eliminarlos.
Revision ID: d2b6c8f14a90
Revises: c7a48f210d63
"""
from alembic import op
import sqlalchemy as sa
from src.shared.database.connection import DB_SCHEMA

revision = "d2b6c8f14a90"
down_revision = "c7a48f210d63"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("estado_doc_valido", "documentos", schema=DB_SCHEMA, type_="check")
    op.create_check_constraint("estado_doc_valido", "documentos",
        "estado IN ('PENDIENTE_REVISION', 'APROBADO', 'OBSERVADO', 'FALTANTE')", schema=DB_SCHEMA)


def downgrade() -> None:
    documentos = sa.table("documentos", sa.column("estado"), schema=DB_SCHEMA)
    op.execute(documentos.update().where(documentos.c.estado == "FALTANTE").values(estado="OBSERVADO"))
    op.drop_constraint("estado_doc_valido", "documentos", schema=DB_SCHEMA, type_="check")
    op.create_check_constraint("estado_doc_valido", "documentos",
        "estado IN ('PENDIENTE_REVISION', 'APROBADO', 'OBSERVADO')", schema=DB_SCHEMA)
