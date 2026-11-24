"""Distingue clases programadas, dictadas y no dictadas."""

from alembic import op
import sqlalchemy as sa

revision = "76b2c13de041"
down_revision = "44bbd687806b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clases", sa.Column("dictada", sa.Boolean(), nullable=True))
    # La planilla anterior consideraba dictadas las fechas ya transcurridas.
    op.execute("""
        UPDATE clases SET dictada = true
        WHERE fecha <= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
    """)


def downgrade() -> None:
    op.drop_column("clases", "dictada")