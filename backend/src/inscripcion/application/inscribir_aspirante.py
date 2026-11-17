import logging
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from uuid import uuid4

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from src.inscripcion.application.acceso_propietario import (
    CredencialPropietario,
    crear_credencial_propietario,
)
from src.core.config import settings
from src.inscripcion.infrastructure.models import Cohorte, DocumentoInscripcion, Legajo
from src.inscripcion.presentation.schemas import InscripcionCreate

logger = logging.getLogger(__name__)


class InscripcionNoDisponible(Exception):
    pass


class InscripcionDuplicada(Exception):
    def __init__(self, field: str) -> None:
        self.field = field


@dataclass(frozen=True)
class DocumentoValidado:
    tipo: str
    contenido: bytes

    @property
    def checksum_sha256(self) -> str:
        return sha256(self.contenido).hexdigest()


@dataclass(frozen=True)
class ResultadoInscripcion:
    legajo: Legajo
    credencial_propietario: CredencialPropietario


def _remove_staged_files(paths: list[Path]) -> None:
    for path in paths:
        try:
            path.unlink(missing_ok=True)
        except OSError:
            logger.exception("No se pudo limpiar el archivo de inscripción %s", path)


def inscribir_aspirante(
    session: Session,
    data: InscripcionCreate,
    documentos: list[DocumentoValidado],
) -> ResultadoInscripcion:
    consulta_cohorte = select(Cohorte).where(Cohorte.inscripcion_abierta.is_(True))
    if data.cohorte_id is not None:
        consulta_cohorte = consulta_cohorte.where(Cohorte.id == data.cohorte_id)
    else:
        consulta_cohorte = consulta_cohorte.order_by(Cohorte.anio.desc()).limit(1)
    cohorte = session.scalar(consulta_cohorte)
    if cohorte is None:
        raise InscripcionNoDisponible

    existente = session.scalar(
        select(Legajo).where(
            Legajo.cohorte_id == cohorte.id,
            or_(Legajo.dni == data.dni, Legajo.email == str(data.email)),
        )
    )
    if existente is not None:
        raise InscripcionDuplicada("dni" if existente.dni == data.dni else "email")

    storage_root = settings.storage_path.resolve()
    storage_dir = storage_root / "inscripciones"
    staged_paths: list[Path] = []
    try:
        storage_dir.mkdir(parents=True, exist_ok=True)
        credencial_propietario = crear_credencial_propietario()
        legajo = Legajo(
            cohorte_id=cohorte.id,
            estado="Pendiente",
            carreras=data.carreras,
            dni=data.dni,
            apellido=data.apellido,
            nombre=data.nombre,
            nacionalidad=data.nacionalidad,
            email=str(data.email),
            email_alternativo=str(data.email_alternativo),
            telefono_movil=data.telefono_movil,
            telefono_fijo=data.telefono_fijo,
            domicilio=data.domicilio,
            ciudad=data.ciudad,
            provincia=data.provincia,
            pais=data.pais,
            titulo_grado=data.titulo_grado,
            titulo_posgrado=data.titulo_posgrado,
            como_conocio=data.como_conocio,
            motivacion=data.motivacion,
            solicita_beca=data.solicita_beca,
            tipo_beca=data.tipo_beca,
            token_propietario_hash=credencial_propietario.token_hash,
            token_propietario_expira_en=credencial_propietario.expira_en,
        )
        session.add(legajo)
        session.flush()

        for documento in documentos:
            filename = f"{uuid4()}.pdf"
            path = storage_dir / filename
            staged_paths.append(path)
            path.write_bytes(documento.contenido)
            session.add(
                DocumentoInscripcion(
                    legajo_id=legajo.id,
                    tipo=documento.tipo,
                    path_storage=(Path("inscripciones") / filename).as_posix(),
                    checksum_sha256=documento.checksum_sha256,
                )
            )

        session.commit()
        return ResultadoInscripcion(
            legajo=legajo,
            credencial_propietario=credencial_propietario,
        )
    except IntegrityError as error:
        session.rollback()
        _remove_staged_files(staged_paths)
        raise InscripcionDuplicada("dni o email") from error
    except (OSError, SQLAlchemyError):
        session.rollback()
        _remove_staged_files(staged_paths)
        raise
