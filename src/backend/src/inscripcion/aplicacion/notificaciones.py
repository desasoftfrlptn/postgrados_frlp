"""Notificaciones correspondientes a las inscripciones."""

from sqlalchemy.ext.asyncio import AsyncSession

from src.conduccion.servicio import encolar_correo
from src.inscripcion.infraestructura.orm_modelos import LegajoORM


def encolar_confirmacion_inscripcion(
    db: AsyncSession,
    legajo: LegajoORM,
) -> None:
    asunto = "Confirmación de inscripción - UTN FRLP"

    contenido = (
        f"Hola, {legajo.nombre} {legajo.apellido}:\n\n"
        "Tu solicitud de inscripción fue registrada correctamente.\n\n"
        f"Carrera: {legajo.carrera_elegida}\n"
        f"Número de seguimiento: {legajo.numero_seguimiento}\n"
        "Estado: Pendiente de revisión\n\n"
        "Conservá tu número de seguimiento para consultar "
        "el estado de tu inscripción desde el sitio público "
        "de Posgrados.\n\n"
        "Este correo confirma la recepción de tu solicitud, "
        "no la aprobación definitiva de la inscripción.\n\n"
        "Departamento de Posgrado\n"
        "Universidad Tecnológica Nacional\n"
        "Facultad Regional La Plata"
    )

    encolar_correo(
        db,
        destinatario=legajo.correo_electronico,
        asunto=asunto,
        contenido=contenido,
    )