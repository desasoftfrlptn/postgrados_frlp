"""Habilita unaccent tambien en bases existentes, no solo en el init de Docker.

Revision ID: c7a48f210d63
Revises: 85b0f489af41
"""
from alembic import op

revision = "c7a48f210d63"
down_revision = "85b0f489af41"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public")


def downgrade() -> None:
    # La extension es compartida por la base; no eliminarla al revertir esta revision.
    pass
