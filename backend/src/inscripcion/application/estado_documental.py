from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import Literal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.core.config import settings
from src.inscripcion.application.gestion_documentos import LegajoDocumentalNoEncontrado
from src.inscripcion.infrastructure.models import DocumentoInscripcion, Legajo

DOCUMENTOS_OBLIGATORIOS_BASE: tuple[str, ...] = (
    "FORM_INSCRIPCION",
    "DNI",
    "TITULO",
    "PARTIDA",
    "CUIT",
)
DOCUMENTO_POSGRADO = "TITULO_POSGRADO"
DOCUMENTO_BECA = "FORM_BECA"
ESTADOS_LEGAJO_VALIDADOS: frozenset[str] = frozenset(
    {"Completado", "Activo", "Graduado", "En Riesgo"}
)
_HEXADECIMALES = frozenset("0123456789abcdefABCDEF")

EstadoDocumentalLiteral = Literal["INCOMPLETO", "COMPLETO", "VALIDADO"]


@dataclass(frozen=True)
class EstadoDocumental:
    estado: EstadoDocumentalLiteral
    completo: bool
    validado: bool
    requeridos: tuple[str, ...]
    presentes: tuple[str, ...]
    faltantes: tuple[str, ...]
    invalidos: tuple[str, ...]
    opcionales_presentes: tuple[str, ...]


def obtener_documentos_requeridos(
    *,
    solicita_beca: bool = False,
    titulo_posgrado: str | None = None,
) -> tuple[str, ...]:
    """Devuelve los tipos de documento obligatorios para un legajo."""
    requeridos = list(DOCUMENTOS_OBLIGATORIOS_BASE)
    if (titulo_posgrado or "").strip():
        requeridos.append(DOCUMENTO_POSGRADO)
    if solicita_beca:
        requeridos.append(DOCUMENTO_BECA)
    return tuple(requeridos)


def es_documento_requerido(
    tipo: str,
    *,
    solicita_beca: bool = False,
    titulo_posgrado: str | None = None,
) -> bool:
    """Indica si un tipo de documento es obligatorio bajo las condiciones dadas."""
    return tipo in obtener_documentos_requeridos(
        solicita_beca=solicita_beca,
        titulo_posgrado=titulo_posgrado,
    )


def _checksum_valido(checksum: str | None) -> bool:
    return (
        isinstance(checksum, str)
        and len(checksum) == 64
        and all(caracter in _HEXADECIMALES for caracter in checksum)
    )


def _documento_valido(
    documento: DocumentoInscripcion,
    *,
    verificar_archivos: bool,
    raiz_almacenamiento: Path,
) -> bool:
    ruta_relativa = (documento.path_storage or "").strip()
    if not ruta_relativa or not _checksum_valido(documento.checksum_sha256):
        return False
    if not verificar_archivos:
        return True

    try:
        raiz_resuelta = raiz_almacenamiento.resolve()
        ruta_archivo = (raiz_resuelta / Path(ruta_relativa)).resolve()
        ruta_archivo.relative_to(raiz_resuelta)
    except (OSError, RuntimeError, ValueError):
        return False

    if not ruta_archivo.is_file():
        return False

    try:
        contenido = ruta_archivo.read_bytes()
    except OSError:
        return False

    return sha256(contenido).hexdigest() == documento.checksum_sha256.lower()


def evaluar_estado_documental(
    legajo: Legajo,
    *,
    verificar_archivos: bool = False,
    raiz_almacenamiento: Path | None = None,
) -> EstadoDocumental:
    """Evalúa el estado documental de un legajo según sus documentos requeridos y validación."""
    raiz = raiz_almacenamiento if raiz_almacenamiento is not None else settings.storage_path
    requeridos = obtener_documentos_requeridos(
        solicita_beca=legajo.solicita_beca,
        titulo_posgrado=legajo.titulo_posgrado,
    )
    requeridos_set = set(requeridos)

    validos: set[str] = set()
    invalidos: list[str] = []
    opcionales_presentes: list[str] = []

    for documento in legajo.documentos:
        if _documento_valido(
            documento,
            verificar_archivos=verificar_archivos,
            raiz_almacenamiento=raiz,
        ):
            validos.add(documento.tipo)
            if documento.tipo not in requeridos_set and documento.tipo not in opcionales_presentes:
                opcionales_presentes.append(documento.tipo)
        elif documento.tipo not in invalidos:
            invalidos.append(documento.tipo)

    # Si existe al menos una copia válida del mismo tipo, no se lo considera inválido.
    invalidos_filtrados = tuple(tipo for tipo in invalidos if tipo not in validos)
    presentes = tuple(tipo for tipo in requeridos if tipo in validos)
    faltantes = tuple(tipo for tipo in requeridos if tipo not in validos)

    completo = len(faltantes) == 0 and len(invalidos_filtrados) == 0
    validado = completo and legajo.estado in ESTADOS_LEGAJO_VALIDADOS

    if not completo:
        estado: EstadoDocumentalLiteral = "INCOMPLETO"
    elif validado:
        estado = "VALIDADO"
    else:
        estado = "COMPLETO"

    return EstadoDocumental(
        estado=estado,
        completo=completo,
        validado=validado,
        requeridos=requeridos,
        presentes=presentes,
        faltantes=faltantes,
        invalidos=invalidos_filtrados,
        opcionales_presentes=tuple(opcionales_presentes),
    )


def evaluar_estado_documental_por_id(
    session: Session,
    legajo_id: UUID,
    *,
    verificar_archivos: bool = False,
    raiz_almacenamiento: Path | None = None,
) -> EstadoDocumental:
    """Carga un legajo con sus documentos y evalúa su estado documental."""
    legajo = session.scalar(
        select(Legajo)
        .options(selectinload(Legajo.documentos))
        .where(Legajo.id == legajo_id)
    )
    if legajo is None:
        raise LegajoDocumentalNoEncontrado
    return evaluar_estado_documental(
        legajo,
        verificar_archivos=verificar_archivos,
        raiz_almacenamiento=raiz_almacenamiento,
    )

