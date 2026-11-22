"""Persistir los datos del perfil personal sin alterar los legajos."""
from alembic import op

revision = "1e2a3b4c5d60"
down_revision = "f4a2c891d630"
branch_labels = None
depends_on = None


def upgrade():
    # El arranque actual también crea las tablas nuevas con metadata.create_all.
    op.execute("""CREATE TABLE IF NOT EXISTS perfiles_usuario (
        usuario_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
        datos JSONB NOT NULL,
        foto TEXT,
        version INTEGER NOT NULL
    )""")


def downgrade():
    op.drop_table("perfiles_usuario")
