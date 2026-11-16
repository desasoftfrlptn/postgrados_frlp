
"""Sincronizar legajos con el modelo actual.

Revision ID: aaa0f2dd6a0c
Revises: d3018ce517f8
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "aaa0f2dd6a0c"
down_revision: Union[str, None] = "d3018ce517f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # Verificar que la estructura inicial sea la esperada.
    columnas = {
        columna["name"]
        for columna in sa.inspect(bind).get_columns("legajos")
    }

    if "dni" not in columnas or "email" not in columnas:
        raise RuntimeError(
            "La estructura actual de legajos no coincide con la esperada."
        )

    # No inventar datos si aparecieron registros desde
    # la última comprobación de la base.
    cantidad = bind.execute(
        sa.text("SELECT COUNT(*) FROM legajos")
    ).scalar_one()

    if cantidad != 0:
        raise RuntimeError(
            "La tabla legajos contiene registros. "
            "Se requiere una migración de datos específica."
        )

    # Adaptar los nombres de las columnas existentes.
    op.alter_column(
        "legajos",
        "dni",
        new_column_name="dni_pasaporte",
        existing_type=sa.String(20),
        type_=sa.String(100),
        existing_nullable=False,
    )

    op.alter_column(
        "legajos",
        "email",
        new_column_name="correo_electronico",
        existing_type=sa.String(255),
        existing_nullable=False,
    )

    op.execute(
        """
        ALTER TABLE legajos
        RENAME CONSTRAINT legajos_email_key
        TO legajos_correo_electronico_key
        """
    )

    op.alter_column(
        "legajos",
        "tipo_carrera",
        new_column_name="carrera_elegida",
        existing_type=sa.String(30),
        type_=sa.String(200),
        existing_nullable=True,
        nullable=False,
    )

    # Agregar la relación con cohortes.
    op.add_column(
        "legajos",
        sa.Column(
            "cohorte_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_legajos_cohorte_id",
        "legajos",
        "cohortes",
        ["cohorte_id"],
        ["id"],
    )

    # Agregar los campos personales y académicos faltantes.
    op.add_column(
        "legajos",
        sa.Column(
            "nacionalidad",
            sa.String(100),
            nullable=False,
        ),
    )

    op.add_column(
        "legajos",
        sa.Column(
            "telefono_movil",
            sa.String(100),
            nullable=True,
        ),
    )

    op.add_column(
        "legajos",
        sa.Column(
            "correo_alternativo",
            sa.String(255),
            nullable=False,
        ),
    )

    op.add_column(
        "legajos",
        sa.Column(
            "domicilio",
            sa.String(255),
            nullable=False,
        ),
    )

    op.add_column(
        "legajos",
        sa.Column(
            "pais",
            sa.String(100),
            nullable=False,
        ),
    )

    op.add_column(
        "legajos",
        sa.Column(
            "provincia",
            sa.String(200),
            nullable=False,
        ),
    )

    op.add_column(
        "legajos",
        sa.Column(
            "ciudad",
            sa.String(200),
            nullable=False,
        ),
    )

    op.add_column(
        "legajos",
        sa.Column(
            "titulo_anterior",
            sa.String(200),
            nullable=False,
        ),
    )

    op.add_column(
        "legajos",
        sa.Column(
            "universidad_anterior",
            sa.String(200),
            nullable=False,
        ),
    )

    # DNI único dentro de cada cohorte.
    op.create_unique_constraint(
        "uq_legajos_cohorte_dni",
        "legajos",
        ["cohorte_id", "dni_pasaporte"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_legajos_cohorte_dni",
        "legajos",
        type_="unique",
    )

    op.drop_constraint(
        "fk_legajos_cohorte_id",
        "legajos",
        type_="foreignkey",
    )

    op.drop_column("legajos", "universidad_anterior")
    op.drop_column("legajos", "titulo_anterior")
    op.drop_column("legajos", "ciudad")
    op.drop_column("legajos", "provincia")
    op.drop_column("legajos", "pais")
    op.drop_column("legajos", "domicilio")
    op.drop_column("legajos", "correo_alternativo")
    op.drop_column("legajos", "telefono_movil")
    op.drop_column("legajos", "nacionalidad")
    op.drop_column("legajos", "cohorte_id")

    op.alter_column(
        "legajos",
        "carrera_elegida",
        new_column_name="tipo_carrera",
        existing_type=sa.String(200),
        type_=sa.String(30),
        existing_nullable=False,
        nullable=True,
    )

    op.execute(
        """
        ALTER TABLE legajos
        RENAME CONSTRAINT legajos_correo_electronico_key
        TO legajos_email_key
        """
    )

    op.alter_column(
        "legajos",
        "correo_electronico",
        new_column_name="email",
        existing_type=sa.String(255),
        existing_nullable=False,
    )

    op.alter_column(
        "legajos",
        "dni_pasaporte",
        new_column_name="dni",
        existing_type=sa.String(100),
        type_=sa.String(20),
        existing_nullable=False,
    )
