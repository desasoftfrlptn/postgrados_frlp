from datetime import date
from src.inscripcion.domain.entities import Aspirante, Legajo, EstadoLegajo, TipoCarrera
from src.inscripcion.domain.value_objects import DNI, Email
from src.inscripcion.domain.estados import validar_transicion, es_verdesolo_manual, calcular_dias_desde_completado


def inscribir_aspirante(
        id: str,
        dni: str,
        email: str,
        nombre: str,
        apellido: str,
        tipo_carrera: str,
        carrera_elegida: str,
        motivacion: str,
        solicita_beca: bool,
        cohorte_id: str,
        hoy: date = None,
) -> tuple[Aspirante, Legajo, str | None]:
    """
    Caso de uso: inscribir aspirante (RF-CORE-001).
    
    Flujo:
    1. Validar DNI (formato 7-8 dígitos) y unicidad en cohorte
    2. Crear Aspirante en estado BORRADOR
    3. Crear Legajo en estado BORRADOR con número de legajo provisional
    4. Retornar datos para que el aspirante complete documentación
    
    Returns: (aspirante, legajo, error_message)
    Error message es None si todo ok, o mensaje de error en caso contrario.
    """
    # 1. Validar formato de DNI
    try:
        dni_obj = DNI(dni)
    except ValueError as e:
        return None, None, f"DNI inválido: {e}"

    # 2. Validar formato de email
    try:
        email_obj = Email(email)
    except ValueError as e:
        return None, None, f"Email inválido: {e}"

    # 3. Validar que el aspirante no esté ya inscripto a 2 carreras simultáneas (BR-001)
    # Nota: esta validación completa requiere acceso a la BD, aquí es solo el caso de uso
    # la verificación real se hará en el repositorio

    # 4. Crear Aspirante
    tipo_carrera_obj = TipoCarrera(tipo_carrera)
    aspirante = Aspirante(
        id=id,
        dni=dni_obj,
        email=email_obj,
        nombre=nombre,
        apellido=apellido,
        tipo_carrera=tipo_carrera_obj,
        carrera_elegida=carrera_elegida,
        motivacion=motivacion,
        solicita_beca=solicita_beca,
        estado=EstadoLegajo.BORRADOR,
        fecha_inscripcion=hoy,
    )

    # 5. Crear Legajo en estado BORRADOR
    # El número de legajo se genera al aprobar (BR-005), por ahora usamos provisional
    # formato: AÑO-COHORTE-SECUENCIAL
    anyo = hoy.year if hoy else date.today().year
    numero_legajo_provisional = f"{anyo}-{cohorte_id[:8]}-001"

    legajo = Legajo(
        id=id,
        numero_legajo=numero_legajo_provisional,
        cohorte_id=cohorte_id,
        dni=dni_obj,
        apellido=apellido,
        nombre=nombre,
        email=email_obj,
        tipo_carrera=tipo_carrera_obj,
        solicita_beca=solicita_beca,
        estado=EstadoLegajo.BORRADOR,
        fecha_inscripcion=hoy,
    )

    return aspirante, legajo, None


def aprobar_legajo(
        legajo: Legajo,
        es_coordinador: bool = False,
        hoy: date = None,
) -> tuple[Legajo, str | None]:
    """
    Caso de uso: coordinador aprueba un legajo (RF-CORE-003).
    
    Flujo:
    1. Validar que el coordinador tiene permiso
    2. Validar transición de estado
    3. Generar número de legajo único (formato: AÑO-COHORTE-SECUENCIAL) (BR-005)
    3. Cambiar estado a COMPLETADO
    4. Programar vencimiento de reserva de vacante a 30 días (BR-005)
    
    Returns: (legajo, error_message)
    """
    if not es_coordinador:
        return legajo, "Solo el coordinador puede aprobar legajos"

    # Validar transición de estado
    if not legajo.puede_transicionar_a(EstadoLegajo.COMPLETADO):
        return legajo, f"No es posible pasar del estado {legajo.estado.value} a COMPLETADO"

    # BR-005: Generar número de legajo único si aún no tiene uno
    if legajo.numero_legajo.startswith("PROVISIONAL") or legajo.numero_legajo == "":
        anyo = (hoy or date.today()).year
        # Obtener el último número de la cohorte para secuencia
        # Por ahora usamos una secuencia simple; en producción consultaríamos BD
        import uuid
        secuencia = uuid.uuid4().int % 1000  # Placeholder: 0-999
        legajo.numero_legajo = f"{anyo}-{legajo.cohorte_id[:8]}-{secuencia:03d}"

    # Transición a COMPLETADO
    legajo.estado = EstadoLegajo.COMPLETADO
    legajo.fecha_activacion = hoy or date.today()

    # Observación: la reserva de vacante comienza ahora (30 días corridos)
    # El job vencero_reservas se encargará de pasar a VENCIDO automáticamente

    return legajo, None


def observar_legajo(
        legajo: Legajo,
        comentario: str,
        es_coordinador: bool = False,
) -> tuple[Legajo, str | None]:
    """
    Caso de uso: coordinador observa un legajo (RF-CORE-003).
    
    Flujo:
    1. Validar que es el coordinador
    2. Transición: EN_REVISIÓN → OBSERVADO o PENDIENTE
    3. Generar notificación automática al aspirante con el comentario
    """
    if not es_coordinador:
        return legajo, "Solo el coordinador puede marcar como observado"

    # Transición PENDIENTE → OBSERVADO o EN_REVISIÓN → OBSERVADO
    if legajo.estado == EstadoLegajo.PENDIENTE:
        legajo.estado = EstadoLegajo.OBSERVADO
    elif legajo.estado == EstadoLegajo.EN_REVISION:
        legajo.estado = EstadoLegajo.OBSERVADO
    else:
        return legajo, f"No se puede observar legajo en estado {legajo.estado.value}"

    # Nota: en un sistema completo, aquí se enviaría email automático al aspirante
    # con el texto del comentario. Por ahora solo actualizamos el estado.

    return legajo, None


def verificar_reserva_vencida(
        legajo: Legajo,
        fecha_completado: date,
        hoy: date = None,
) -> bool:
    """
    Verifica si la reserva de vacante de 30 días ha vencido (BR-005).
    
    Si el legajo está en COMPLETADO hace más de 30 días sin pasar a ACTIVO,
    debe cambiar automáticamente a VENCIDO.
    """
    if hoy is None:
        hoy = date.today()

    dias_transcurridos = calcular_dias_desde_completado(fecha_completado, hoy)
    return dias_transcurridos > 30
