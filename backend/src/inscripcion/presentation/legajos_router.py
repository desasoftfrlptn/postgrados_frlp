import json
from datetime import date
from http import HTTPStatus
from io import BytesIO
from typing import TypedDict
from unicodedata import normalize
from uuid import UUID
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import Select, String, cast, or_, select
from sqlalchemy.orm import Session, selectinload

from src.authentication.infrastructure.models import User
from src.db.session import get_db
from src.inscripcion.application.estado_documental import evaluar_estado_documental
from src.inscripcion.infrastructure.models import Cohorte, Legajo
from src.inscripcion.presentation.schemas import (
    Carrera,
    EstadoDocumentalResponse,
    LegajoDetalleResponse,
    LegajoListadoResponse,
)
from src.inscripcion.presentation.acceso_legajo import (
    autorizar_dueno_o_coordinador,
    bearer_scheme,
    exigir_credencial,
)
from src.shared.autorizacion.permisos import requerir_roles

router = APIRouter(prefix="/api/v1/legajos", tags=["legajos"])
_MAXIMO_FILAS_EXPORTACION = 500
_TIPO_DOCUMENTO_BECA = "FORM_BECA"


class FiltrosLegajos(TypedDict):
    estado: str | None
    cohorte_id: UUID | None
    carrera: Carrera | None
    tiene_beca: bool | None
    dni: str | None
    apellido: str | None


def _consulta_legajos(
    *,
    estado: str | None,
    cohorte_id: UUID | None,
    carrera: Carrera | None,
    tiene_beca: bool | None,
    dni: str | None,
    apellido: str | None,
) -> Select[tuple[Legajo]]:
    consulta = select(Legajo)
    if estado:
        consulta = consulta.where(Legajo.estado == estado.strip())
    if cohorte_id is not None:
        consulta = consulta.where(Legajo.cohorte_id == cohorte_id)
    if carrera:
        carreras_serializadas = cast(Legajo.carreras, String)
        consulta = consulta.where(
            or_(
                carreras_serializadas.ilike(f'%"{carrera}"%'),
                carreras_serializadas.ilike(
                    f"%{json.dumps(carrera, ensure_ascii=True)}%"
                ),
            )
        )
    if tiene_beca is not None:
        consulta = consulta.where(Legajo.solicita_beca.is_(tiene_beca))
    if dni:
        consulta = consulta.where(Legajo.dni == dni.strip())
    if apellido is not None and apellido.isascii():
        apellido_literal = apellido.strip().replace("\\", "\\\\")
        apellido_literal = apellido_literal.replace("%", "\\%").replace("_", "\\_")
        consulta = consulta.where(
            Legajo.apellido.ilike(
                f"%{apellido_literal}%",
                escape="\\",
            )
        )
    return consulta.order_by(Legajo.fecha_inscripcion.desc(), Legajo.apellido)


def _parametros_filtro(
    estado: str | None,
    cohorte_id: UUID | None,
    carrera: Carrera | None,
    tiene_beca: bool | None,
    dni: str | None,
    apellido: str | None,
) -> FiltrosLegajos:
    return {
        "estado": estado,
        "cohorte_id": cohorte_id,
        "carrera": carrera,
        "tiene_beca": tiene_beca,
        "dni": dni,
        "apellido": apellido,
    }


def _obtener_legajos(
    session: Session,
    consulta: Select[tuple[Legajo]],
    *,
    apellido: str | None,
    incluir_documentos: bool,
) -> list[Legajo]:
    if incluir_documentos and apellido is None:
        return list(
            session.scalars(consulta.options(selectinload(Legajo.documentos)))
        )

    registros = list(session.scalars(consulta))
    if apellido is not None:
        texto_busqueda = normalize("NFC", apellido.strip()).casefold()
        registros = [
            legajo
            for legajo in registros
            if texto_busqueda in normalize("NFC", legajo.apellido).casefold()
        ]
    if not incluir_documentos or not registros:
        return registros

    ids_registros = [legajo.id for legajo in registros]
    con_documentos: dict[UUID, Legajo] = {}
    for inicio in range(0, len(ids_registros), 500):
        lote_ids = ids_registros[inicio : inicio + 500]
        con_documentos.update(
            {
                legajo.id: legajo
                for legajo in session.scalars(
                    select(Legajo)
                    .options(selectinload(Legajo.documentos))
                    .where(Legajo.id.in_(lote_ids))
                )
            }
        )
    return [con_documentos[legajo.id] for legajo in registros]


def _documento_beca(legajo: Legajo) -> dict[str, str] | None:
    documento = next(
        (doc for doc in legajo.documentos if doc.tipo == _TIPO_DOCUMENTO_BECA),
        None,
    )
    return {"tipo": documento.tipo} if documento is not None else None


def _legajo_listado(legajo: Legajo) -> LegajoListadoResponse:
    return LegajoListadoResponse(
        id=legajo.id,
        numero_legajo=legajo.numero_legajo,
        apellido=legajo.apellido,
        nombre=legajo.nombre,
        dni=legajo.dni,
        estado=legajo.estado,
        carreras=legajo.carreras,
        solicita_beca=legajo.solicita_beca,
        tipo_beca=legajo.tipo_beca,
        documento_beca=_documento_beca(legajo),
    )


@router.get("", response_model=list[LegajoListadoResponse])
def listar_legajos(
    estado: str | None = Query(default=None, max_length=30),
    cohorte_id: UUID | None = None,
    carrera: Carrera | None = None,
    tiene_beca: bool | None = None,
    dni: str | None = Query(default=None, max_length=20),
    apellido: str | None = Query(default=None, min_length=3, max_length=120),
    session: Session = Depends(get_db),
    _: User = Depends(requerir_roles("COORDINADOR")),
) -> list[LegajoListadoResponse]:
    if apellido is not None and len(apellido.strip()) < 3:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="La búsqueda por apellido requiere al menos tres caracteres",
        )
    registros = _obtener_legajos(
        session,
        _consulta_legajos(**_parametros_filtro(
            estado, cohorte_id, carrera, tiene_beca, dni, apellido
        )),
        apellido=apellido,
        incluir_documentos=True,
    )
    return [_legajo_listado(legajo) for legajo in registros]


@router.get("/exportar")
def exportar_legajos(
    estado: str | None = Query(default=None, max_length=30),
    cohorte_id: UUID | None = None,
    carrera: Carrera | None = None,
    tiene_beca: bool | None = None,
    dni: str | None = Query(default=None, max_length=20),
    apellido: str | None = Query(default=None, min_length=3, max_length=120),
    session: Session = Depends(get_db),
    _: User = Depends(requerir_roles("COORDINADOR")),
) -> StreamingResponse:
    if apellido is not None and len(apellido.strip()) < 3:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="La búsqueda por apellido requiere al menos tres caracteres",
        )
    registros = _obtener_legajos(
        session,
        _consulta_legajos(**_parametros_filtro(
            estado, cohorte_id, carrera, tiene_beca, dni, apellido
        )),
        apellido=apellido,
        incluir_documentos=False,
    )
    if len(registros) > _MAXIMO_FILAS_EXPORTACION:
        raise HTTPException(
            status_code=HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
            detail=f"La exportación admite hasta {_MAXIMO_FILAS_EXPORTACION} legajos",
        )

    encabezados = [
        "N.º de legajo",
        "Apellido",
        "Nombre",
        "DNI",
        "Estado",
        "Carreras",
        "Solicita beca",
        "Tipo de beca",
    ]
    filas = [encabezados]
    for legajo in registros:
        filas.append(
            [
                legajo.numero_legajo or "",
                legajo.apellido,
                legajo.nombre,
                legajo.dni,
                legajo.estado,
                ", ".join(legajo.carreras),
                "Sí" if legajo.solicita_beca else "No",
                legajo.tipo_beca or "",
            ]
        )

    anchos = [
        min(max(len(str(fila[indice])) for fila in filas) + 2, 50)
        for indice in range(len(encabezados))
    ]
    columnas_xml = "".join(
        f'<col min="{indice}" max="{indice}" width="{ancho}" customWidth="1"/>'
        for indice, ancho in enumerate(anchos, start=1)
    )
    datos_xml = []
    for numero_fila, fila in enumerate(filas, start=1):
        celdas_xml = []
        for indice_columna, valor in enumerate(fila, start=1):
            letra_columna = chr(ord("A") + indice_columna - 1)
            estilo = ' s="1"' if numero_fila == 1 else ""
            celdas_xml.append(
                f'<c r="{letra_columna}{numero_fila}" t="inlineStr"{estilo}>'
                f"<is><t>{escape(str(valor))}</t></is></c>"
            )
        datos_xml.append(f'<row r="{numero_fila}">{"".join(celdas_xml)}</row>')
    ultimo_renglon = max(1, len(filas))
    hoja_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<sheetViews><sheetView workbookViewId="0">'
        '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
        "</sheetView></sheetViews>"
        f"<cols>{columnas_xml}</cols>"
        f'<sheetData>{"".join(datos_xml)}</sheetData>'
        f'<autoFilter ref="A1:H{ultimo_renglon}"/>'
        "</worksheet>"
    )
    estilos_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>'
        '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
        '<fills count="2"><fill><patternFill patternType="none"/></fill>'
        '<fill><patternFill patternType="gray125"/></fill></fills>'
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/>'
        "</border></borders>"
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" '
        'borderId="0"/></cellStyleXfs>'
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" '
        'xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" '
        'xfId="0" applyFont="1"/></cellXfs>'
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" '
        'builtinId="0"/></cellStyles></styleSheet>'
    )
    libro_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets><sheet name="Legajos" sheetId="1" r:id="rId1"/></sheets></workbook>'
    )
    contenido_tipos_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        '<Override PartName="/xl/styles.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        "</Types>"
    )
    relaciones_raiz_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        "</Relationships>"
    )
    relaciones_libro_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        "</Relationships>"
    )
    salida = BytesIO()
    with ZipFile(salida, "w", ZIP_DEFLATED) as archivo:
        archivo.writestr("[Content_Types].xml", contenido_tipos_xml)
        archivo.writestr("_rels/.rels", relaciones_raiz_xml)
        archivo.writestr("xl/workbook.xml", libro_xml)
        archivo.writestr("xl/_rels/workbook.xml.rels", relaciones_libro_xml)
        archivo.writestr("xl/worksheets/sheet1.xml", hoja_xml)
        archivo.writestr("xl/styles.xml", estilos_xml)
    salida.seek(0)
    cohorte = session.get(Cohorte, cohorte_id) if cohorte_id is not None else None
    sufijo_cohorte = f"cohorte{cohorte.anio}" if cohorte is not None else "cohortes"
    return StreamingResponse(
        salida,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": (
                f'attachment; filename="inscriptos-{sufijo_cohorte}-'
                f'{date.today():%Y-%m-%d}.xlsx"'
            ),
            "Cache-Control": "private, no-store",
        },
    )


@router.get("/{id}", response_model=LegajoDetalleResponse)
def obtener_legajo(
    id: UUID,
    session: Session = Depends(get_db),
    credenciales: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> LegajoDetalleResponse:
    credenciales = exigir_credencial(credenciales)
    legajo = session.scalar(
        select(Legajo)
        .options(selectinload(Legajo.documentos))
        .where(Legajo.id == id)
    )
    if legajo is None:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="No se encontró el legajo solicitado",
        )
    autorizar_dueno_o_coordinador(legajo, credenciales, session)
    evaluacion = evaluar_estado_documental(legajo)
    return LegajoDetalleResponse(
        id=legajo.id,
        numero_legajo=legajo.numero_legajo,
        cohorte_id=legajo.cohorte_id,
        estado=legajo.estado,
        carreras=legajo.carreras,
        dni=legajo.dni,
        apellido=legajo.apellido,
        nombre=legajo.nombre,
        nacionalidad=legajo.nacionalidad,
        email=legajo.email,
        email_alternativo=legajo.email_alternativo,
        telefono_movil=legajo.telefono_movil,
        telefono_fijo=legajo.telefono_fijo,
        domicilio=legajo.domicilio,
        ciudad=legajo.ciudad,
        provincia=legajo.provincia,
        pais=legajo.pais,
        titulo_grado=legajo.titulo_grado,
        titulo_posgrado=legajo.titulo_posgrado,
        como_conocio=legajo.como_conocio,
        motivacion=legajo.motivacion,
        solicita_beca=legajo.solicita_beca,
        tipo_beca=legajo.tipo_beca,
        fecha_inscripcion=legajo.fecha_inscripcion,
        documentos=[
            {
                "id": documento.id,
                "tipo": documento.tipo,
                "fecha_subida": documento.fecha_subida,
            }
            for documento in legajo.documentos
        ],
        documentacion_completa=evaluacion.completo,
        estado_documental=evaluacion.estado,
        documentos_faltantes=list(evaluacion.faltantes),
    )


@router.get("/{id}/estado-documental", response_model=EstadoDocumentalResponse)
def obtener_estado_documental_legajo(
    id: UUID,
    session: Session = Depends(get_db),
    credenciales: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> EstadoDocumentalResponse:
    credenciales = exigir_credencial(credenciales)
    legajo = session.scalar(
        select(Legajo)
        .options(selectinload(Legajo.documentos))
        .where(Legajo.id == id)
    )
    if legajo is None:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="No se encontró el legajo solicitado",
        )
    autorizar_dueno_o_coordinador(legajo, credenciales, session)
    evaluacion = evaluar_estado_documental(legajo, verificar_archivos=True)
    return EstadoDocumentalResponse(
        estado=evaluacion.estado,
        completo=evaluacion.completo,
        validado=evaluacion.validado,
        requeridos=list(evaluacion.requeridos),
        presentes=list(evaluacion.presentes),
        faltantes=list(evaluacion.faltantes),
        invalidos=list(evaluacion.invalidos),
        opcionales_presentes=list(evaluacion.opcionales_presentes),
    )
