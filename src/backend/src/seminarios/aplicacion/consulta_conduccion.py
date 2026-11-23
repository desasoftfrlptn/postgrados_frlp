"""Consulta académica de solo lectura para Conducción."""
from uuid import UUID
from sqlalchemy import select
from src.inscripcion.infraestructura.orm_modelos import LegajoORM
from src.inscripcion.infraestructura.cohortes_modelos import CohorteORM
from src.seminarios.infraestructura.orm_modelos import SeminarioORM, InscripcionSeminarioORM
from src.usuarios.modelos import UsuarioORM


async def consultar_cursadas(db, cohorte_id: UUID):
    consulta = (select(InscripcionSeminarioORM, SeminarioORM, LegajoORM, UsuarioORM)
        .join(SeminarioORM, SeminarioORM.id == InscripcionSeminarioORM.seminario_id)
        .join(LegajoORM, LegajoORM.id == InscripcionSeminarioORM.legajo_id)
        .join(CohorteORM, CohorteORM.id == LegajoORM.cohorte_id)
        .join(UsuarioORM, UsuarioORM.id == SeminarioORM.docente_id)
        .where(CohorteORM.id == cohorte_id, SeminarioORM.carrera_id == CohorteORM.carrera_id)
        .order_by(SeminarioORM.nombre, LegajoORM.apellido, LegajoORM.nombre))
    filas = (await db.execute(consulta)).all()
    return [{"id": str(i.id), "seminario": s.nombre, "docente": f"{u.apellido}, {u.nombre}",
             "estudiante": f"{l.apellido}, {l.nombre}", "documento": l.dni_pasaporte,
             "estado": i.estado, "nota": i.nota_final, "asistencias": i.asistencias,
             "total_clases": i.total_clases} for i, s, l, u in filas]
