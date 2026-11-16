"""Add role-based users and rotatable refresh sessions.

Revision ID: 20261115_0002
Revises: 20261104_0001
Create Date: 2026-11-15
"""

import sqlalchemy as sa
from alembic import op

revision = "20261115_0002"
down_revision = "20261104_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=60), nullable=False),
        sa.Column("rol", sa.String(length=20), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.true(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "rol IN ('COORDINADOR', 'CPR', 'ADMIN')",
            name="ck_usuarios_rol",
        ),
        sa.UniqueConstraint("email", name="uq_usuarios_email"),
    )
    op.create_table(
        "sesiones_auth",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("family_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["usuarios.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint("token_hash", name="uq_sesiones_auth_token_hash"),
    )
    op.create_index(
        "ix_sesiones_auth_family_id",
        "sesiones_auth",
        ["family_id"],
    )


def downgrade() -> None:
    op.drop_table("sesiones_auth")
    op.drop_table("usuarios")
