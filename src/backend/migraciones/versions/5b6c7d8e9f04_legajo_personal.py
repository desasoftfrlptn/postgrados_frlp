"""Un número permanente por documento, independiente de las inscripciones."""
from alembic import op

revision = "5b6c7d8e9f04"
down_revision = "4a5b6c7d8e93"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""CREATE TABLE IF NOT EXISTS legajos_personales (
        documento VARCHAR(100) PRIMARY KEY, numero VARCHAR(50) NOT NULL UNIQUE)""")
    # Conservar el primer número asignado; no modificar el seguimiento de las solicitudes.
    op.execute("""INSERT INTO legajos_personales(documento, numero)
        SELECT DISTINCT ON (upper(regexp_replace(l.dni_pasaporte, '[.[:space:]]', '', 'g')))
            upper(regexp_replace(l.dni_pasaporte, '[.[:space:]]', '', 'g')), g.numero_legajo
        FROM gestion_legajos g JOIN legajos l ON l.id = g.legajo_id
        WHERE g.numero_legajo IS NOT NULL
        ORDER BY upper(regexp_replace(l.dni_pasaporte, '[.[:space:]]', '', 'g')),
            g.fecha_aprobacion NULLS LAST, g.fecha_matricula NULLS LAST, g.numero_legajo
        ON CONFLICT (documento) DO NOTHING""")
    op.execute("ALTER TABLE gestion_legajos DROP CONSTRAINT IF EXISTS uq_gestion_legajos_numero")
    op.execute("ALTER TABLE gestion_legajos DROP CONSTRAINT IF EXISTS gestion_legajos_numero_legajo_key")
    op.execute("""UPDATE gestion_legajos g SET numero_legajo = p.numero
        FROM legajos l JOIN legajos_personales p
          ON p.documento = upper(regexp_replace(l.dni_pasaporte, '[.[:space:]]', '', 'g'))
        WHERE g.legajo_id = l.id AND (g.numero_legajo IS NOT NULL OR l.estado IN ('ACTIVO', 'EN_RIESGO', 'GRADUADO', 'COMPLETADO'))""")


def downgrade():
    raise RuntimeError("La consolidación de números no es reversible automáticamente; restaurá el respaldo previo.")
