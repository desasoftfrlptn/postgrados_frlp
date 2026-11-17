from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from io import BytesIO
import re
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from src.carga_academica.presentacion.esquemas import PlanillaRespuesta
from src.shared.http.excel import generar_excel

_NS_MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
_MAX_BYTES_EXCEL = 5 * 1024 * 1024
_REF_CELDA_RE = re.compile(r"^([A-Z]+)[0-9]+$")


class ExcelInvalidoError(ValueError):
    pass


@dataclass(frozen=True)
class NotaImportada:
    email: str
    nota: Decimal


def _indice_columna(referencia: str) -> int | None:
    coincidencia = _REF_CELDA_RE.match(referencia.upper())
    if coincidencia is None:
        return None
    indice = 0
    for letra in coincidencia.group(1):
        indice = indice * 26 + (ord(letra) - ord("A") + 1)
    return indice - 1


def _texto_celda(celda: ElementTree.Element, cadenas_compartidas: list[str]) -> str:
    tipo = celda.attrib.get("t", "")
    if tipo == "inlineStr":
        nodo_texto = celda.find(f"{_NS_MAIN}is/{_NS_MAIN}t")
        if nodo_texto is not None and nodo_texto.text is not None:
            return nodo_texto.text
        partes = [
            nodo.text for nodo in celda.findall(f".//{_NS_MAIN}t") if nodo.text is not None
        ]
        return "".join(partes)

    nodo_valor = celda.find(f"{_NS_MAIN}v")
    if nodo_valor is None or nodo_valor.text is None:
        return ""
    if tipo == "s":
        try:
            return cadenas_compartidas[int(nodo_valor.text)]
        except (ValueError, IndexError) as error:
            raise ExcelInvalidoError("El archivo Excel contiene cadenas compartidas inválidas") from error
    return nodo_valor.text


def _leer_cadenas_compartidas(archivo: ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archivo.namelist():
        return []
    try:
        raiz = ElementTree.fromstring(archivo.read("xl/sharedStrings.xml"))
    except ElementTree.ParseError as error:
        raise ExcelInvalidoError("No se pudo leer la tabla de textos del Excel") from error

    cadenas: list[str] = []
    for item in raiz.findall(f"{_NS_MAIN}si"):
        partes = [nodo.text for nodo in item.findall(f".//{_NS_MAIN}t") if nodo.text is not None]
        cadenas.append("".join(partes))
    return cadenas


def leer_filas_excel(contenido: bytes) -> list[list[str]]:
    """Lee las filas de la primera hoja de un archivo .xlsx."""
    if not contenido:
        raise ExcelInvalidoError("El archivo Excel está vacío")
    if len(contenido) > _MAX_BYTES_EXCEL:
        raise ExcelInvalidoError("El archivo Excel supera el tamaño máximo permitido")

    try:
        with ZipFile(BytesIO(contenido)) as archivo:
            if "xl/worksheets/sheet1.xml" not in archivo.namelist():
                raise ExcelInvalidoError("El archivo Excel no contiene la hoja principal")
            cadenas_compartidas = _leer_cadenas_compartidas(archivo)
            hoja_xml = archivo.read("xl/worksheets/sheet1.xml")
    except BadZipFile as error:
        raise ExcelInvalidoError("El archivo no tiene formato Excel (.xlsx) válido") from error

    try:
        raiz = ElementTree.fromstring(hoja_xml)
    except ElementTree.ParseError as error:
        raise ExcelInvalidoError("El contenido XML de la hoja Excel es inválido") from error

    filas: list[list[str]] = []
    for renglon in raiz.findall(f".//{_NS_MAIN}sheetData/{_NS_MAIN}row"):
        celdas = renglon.findall(f"{_NS_MAIN}c")
        valores: list[str] = []
        for posicion_fallback, celda in enumerate(celdas):
            indice = _indice_columna(celda.attrib.get("r", ""))
            if indice is None:
                indice = posicion_fallback
            while len(valores) <= indice:
                valores.append("")
            valores[indice] = _texto_celda(celda, cadenas_compartidas)
        filas.append(valores)
    return filas


def _parsear_nota(valor_crudo: str, fila_num: int) -> Decimal:
    texto = valor_crudo.strip().replace(",", ".")
    if not texto:
        raise ExcelInvalidoError(f"Falta la nota en la fila {fila_num}")
    try:
        nota = Decimal(texto)
    except InvalidOperation as error:
        raise ExcelInvalidoError(f"Nota inválida en la fila {fila_num}: {valor_crudo!r}") from error
    if not nota.is_finite() or nota < Decimal("1") or nota > Decimal("10"):
        raise ExcelInvalidoError(f"La nota de la fila {fila_num} debe estar entre 1 y 10")
    if nota.as_tuple().exponent < -1:
        raise ExcelInvalidoError(
            f"La nota de la fila {fila_num} admite como máximo un decimal"
        )
    return nota


def importar_notas_excel(contenido: bytes) -> list[NotaImportada]:
    """Extrae y valida notas finales desde un archivo .xlsx con columnas Email y Nota."""
    filas = leer_filas_excel(contenido)
    if not filas:
        raise ExcelInvalidoError("El archivo Excel no contiene filas")

    encabezados = [col.strip().casefold() for col in filas[0]]
    try:
        idx_email = encabezados.index("email")
        idx_nota = encabezados.index("nota")
    except ValueError as error:
        raise ExcelInvalidoError(
            "El archivo Excel debe incluir las columnas 'Email' y 'Nota'"
        ) from error

    notas: list[NotaImportada] = []
    emails_vistos: set[str] = set()
    for numero_fila, fila in enumerate(filas[1:], start=2):
        if not any(celda.strip() for celda in fila):
            continue
        email = fila[idx_email].strip().lower() if idx_email < len(fila) else ""
        if not email:
            raise ExcelInvalidoError(f"Falta el email en la fila {numero_fila}")
        if email in emails_vistos:
            raise ExcelInvalidoError(f"Email duplicado en la fila {numero_fila}: {email}")
        emails_vistos.add(email)

        valor_nota = fila[idx_nota] if idx_nota < len(fila) else ""
        notas.append(NotaImportada(email=email, nota=_parsear_nota(valor_nota, numero_fila)))

    if not notas:
        raise ExcelInvalidoError("El archivo Excel no contiene calificaciones para importar")
    return notas


def exportar_planilla_excel(planilla: PlanillaRespuesta) -> BytesIO:
    """Genera el archivo Excel de asistencia para la planilla de un seminario."""
    filas = [[
        "Apellido",
        "Nombre",
        "Email",
        "Carrera de grado",
        *[clase.fecha.isoformat() for clase in planilla.clases],
        "% Asistencia",
    ]]
    for estudiante in planilla.estudiantes:
        filas.append([
            estudiante.apellido,
            estudiante.nombre,
            estudiante.email,
            estudiante.titulo_grado,
            *["P" if celda.presente else "A" for celda in estudiante.asistencias],
            str(estudiante.porcentaje_asistencia),
        ])
    return generar_excel(filas, "Asistencia")

