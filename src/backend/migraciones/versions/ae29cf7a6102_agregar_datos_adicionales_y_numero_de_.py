
"""Agregar datos adicionales y numero de inscripcion."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "ae29cf7a6102"
down_revision: Union[str, None] = "aaa0f2dd6a0c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Campos adicionales del formulario.
    op.add_column(
        "legajos",
        sa.Column(
            "forma_conocio_ofertas",
            sa.String(100),
            nullable=False,
            server_default="Sin especificar",
        ),
    )

    op.add_column(
        "legajos",
        sa.Column(
            "motivos_cursar",
            sa.Text(),
            nullable=False,
            server_default="Sin especificar",
        ),
    )

    op.add_column(
        "legajos",
        sa.Column(
            "solicitud_beca",
            sa.Integer(),
            nullable=True,
        ),
    )

    # Número de inscripción.
    op.add_column(
        "legajos",
        sa.Column(
            "numero_seguimiento",
            sa.String(30),
            nullable=True,
        ),
    )

    # Tabla para controlar la numeración anual.
    op.create_table(
        "contadores_inscripcion",
        sa.Column(
            "anio",
            sa.Integer(),
            primary_key=True,
        ),
        sa.Column(
            "ultimo_numero",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )

    # Completar números para registros preexistentes,
    # si los hubiera.
    op.execute(
    """
    WITH numerados AS (
        SELECT
            id,
            ROW_NUMBER() OVER (
                ORDER BY created_at NULLS LAST, id
            ) AS numero
        FROM legajos
    )
    UPDATE legajos AS l
    SET numero_seguimiento =
        'INS-' ||
        EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER::TEXT ||
        '-' ||
        n.numero::TEXT
    FROM numerados AS n
    WHERE l.id = n.id
    """
    )
     # Inicializar el contador anual con los registros existentes.
    op.execute(
        """
        INSERT INTO contadores_inscripcion (
            anio,
            ultimo_numero
        )
        SELECT
            EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
            COUNT(*)::INTEGER
        FROM legajos
        WHERE numero_seguimiento LIKE
            'INS-' || EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER || '-%'
        """
    )

    # Garantizar que los números sean únicos.
    op.alter_column(
        "legajos",
        "numero_seguimiento",
        nullable=False,
    )

    op.create_unique_constraint(
        "uq_legajos_numero_seguimiento",
        "legajos",
        ["numero_seguimiento"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_legajos_numero_seguimiento",
        "legajos",
        type_="unique",
    )

    op.drop_table("contadores_inscripcion")

    op.drop_column("legajos", "numero_seguimiento")
    op.drop_column("legajos", "solicitud_beca")
    op.drop_column("legajos", "motivos_cursar")
    op.drop_column("legajos", "forma_conocio_ofertas")
