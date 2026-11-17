import logging
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from src.core.config import settings
from src.inscripcion.application.inscribir_aspirante import DocumentoValidado
from src.inscripcion.infrastructure.models import DocumentoInscripcion, Legajo

logger = logging.getLogger(__name__)
_ESTADOS_EDITABLES = {"Pendiente", "Observado"}


class LegajoDocumentalNoEncontrado(Exception):
    pass


class CargaDocumentalNoPermitida(Exception):
    pass


class DocumentoDuplicado(Exception):
    pass


def _borrar_archivo(ruta: Path) -> None:
    try:
        ruta.unlink(missing_ok=True)
    except OSError:
        logger.exception("No se pudo limpiar el archivo documental %s", ruta)


def _ruta_privada(raiz: Path, ruta_relativa: str) -> Path | None:
    try:
        ruta = (raiz / Path(ruta_relativa)).resolve()
        ruta.relative_to(raiz)
    except (OSError, RuntimeError, ValueError):
        return None
    return ruta


def _es_documento_duplicado(error: IntegrityError) -> bool:
    diagnostico = getattr(error.orig, "diag", None)
    if getattr(diagnostico, "constraint_name", None) == "uq_documento_legajo_tipo":
        return True
    return (
        "UNIQUE constraint failed: "
        "documentos_inscripcion.legajo_id, documentos_inscripcion.tipo"
        in str(error.orig)
    )


def agregar_o_reemplazar_documento(
    session: Session,
    *,
    legajo_id: UUID,
    documento_validado: DocumentoValidado,
) -> tuple[DocumentoInscripcion, bool]:
    legajo = session.scalar(
        select(Legajo).where(Legajo.id == legajo_id).with_for_update()
    )
    if legajo is None:
        raise LegajoDocumentalNoEncontrado
    if legajo.estado not in _ESTADOS_EDITABLES:
        raise CargaDocumentalNoPermitida

    documento = session.scalar(
        select(DocumentoInscripcion)
        .where(
            DocumentoInscripcion.legajo_id == legajo_id,
            DocumentoInscripcion.tipo == documento_validado.tipo,
        )
        .with_for_update()
    )
    reemplazado = documento is not None
    raiz_almacenamiento = settings.storage_path.resolve()
    directorio = raiz_almacenamiento / "inscripciones"
    ruta_nueva = directorio / f"{uuid4()}.pdf"
    ruta_anterior = (
        _ruta_privada(raiz_almacenamiento, documento.path_storage)
        if documento is not None
        else None
    )

    try:
        directorio.mkdir(parents=True, exist_ok=True)
        ruta_nueva.write_bytes(documento_validado.contenido)
        if documento is None:
            documento = DocumentoInscripcion(
                legajo_id=legajo_id,
                tipo=documento_validado.tipo,
                path_storage=(Path("inscripciones") / ruta_nueva.name).as_posix(),
                checksum_sha256=documento_validado.checksum_sha256,
                fecha_subida=datetime.now(timezone.utc),
            )
            session.add(documento)
        else:
            documento.path_storage = (
                Path("inscripciones") / ruta_nueva.name
            ).as_posix()
            documento.checksum_sha256 = documento_validado.checksum_sha256
            documento.fecha_subida = datetime.now(timezone.utc)
        session.commit()
    except IntegrityError as error:
        session.rollback()
        _borrar_archivo(ruta_nueva)
        if _es_documento_duplicado(error):
            raise DocumentoDuplicado from error
        raise
    except (OSError, SQLAlchemyError):
        session.rollback()
        _borrar_archivo(ruta_nueva)
        raise

    if documento is not None and ruta_anterior is None and reemplazado:
        logger.warning(
            "La ruta anterior del documento no es privada; no se eliminó legajo_id=%s",
            legajo_id,
        )
    elif ruta_anterior is not None and ruta_anterior != ruta_nueva:
        if ruta_anterior.is_file():
            _borrar_archivo(ruta_anterior)
        elif reemplazado:
            logger.warning(
                "No se encontró el documento anterior para limpiar legajo_id=%s",
                legajo_id,
            )
    return documento, reemplazado
