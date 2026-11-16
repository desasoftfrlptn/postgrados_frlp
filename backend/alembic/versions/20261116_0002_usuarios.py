"""Crea cuentas internas para autenticacion de coordinadores."""

import sqlalchemy as sa
from alembic import op

revision = "20261116_0002"
down_revision = "20261104_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("hash_contrasena", sa.String(length=60), nullable=False),
        sa.Column("rol", sa.String(length=20), nullable=False),
        sa.Column(
            "activo",
            sa.Boolean(),
            server_default=sa.true(),
            nullable=False,
        ),
        sa.Column(
            "creado_en",
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
        sa.Column("familia_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("usuario_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("hash_token", sa.String(length=64), nullable=False),
        sa.Column("vence_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revocada_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "creada_en",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            name="fk_sesiones_auth_usuario_id_usuarios",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("hash_token", name="uq_sesiones_auth_hash_token"),
    )
    op.create_index(
        "ix_sesiones_auth_familia_id",
        "sesiones_auth",
        ["familia_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_sesiones_auth_familia_id", table_name="sesiones_auth")
    op.drop_table("sesiones_auth")
    op.drop_table("usuarios")
