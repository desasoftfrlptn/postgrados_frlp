from io import BytesIO
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


def _columna(indice: int) -> str:
    letras = ""
    while indice:
        indice, resto = divmod(indice - 1, 26)
        letras = chr(65 + resto) + letras
    return letras


def generar_excel(filas: list[list[str]], nombre_hoja: str) -> BytesIO:
    renglones = []
    for numero, fila in enumerate(filas, 1):
        celdas = []
        for indice, valor in enumerate(fila, 1):
            texto = "".join(
                caracter for caracter in valor
                if caracter in "\t\n\r" or 32 <= ord(caracter) <= 0xD7FF
                or 0xE000 <= ord(caracter) <= 0xFFFD
                or 0x10000 <= ord(caracter) <= 0x10FFFF
            )
            estilo = ' s="1"' if numero == 1 else ""
            celdas.append(
                f'<c r="{_columna(indice)}{numero}" t="inlineStr"{estilo}>'
                f'<is><t xml:space="preserve">{escape(texto)}</t></is></c>'
            )
        renglones.append(f'<row r="{numero}">{"".join(celdas)}</row>')
    ultimo = _columna(len(filas[0])) if filas and filas[0] else "A"
    hoja = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(renglones)}</sheetData>'
        f'<autoFilter ref="A1:{ultimo}{max(len(filas), 1)}"/></worksheet>'
    )
    salida = BytesIO()
    with ZipFile(salida, "w", ZIP_DEFLATED) as archivo:
        archivo.writestr("[Content_Types].xml", (
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            '</Types>'
        ))
        archivo.writestr("_rels/.rels", (
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            '</Relationships>'
        ))
        archivo.writestr("xl/workbook.xml", (
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            f'<sheets><sheet name="{escape(nombre_hoja, {chr(34): "&quot;"})}" sheetId="1" r:id="rId1"/></sheets></workbook>'
        ))
        archivo.writestr("xl/_rels/workbook.xml.rels", (
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            '</Relationships>'
        ))
        archivo.writestr("xl/styles.xml", (
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<fonts count="2"><font/><font><b/></font></fonts>'
            '<fills count="2"><fill><patternFill patternType="none"/></fill>'
            '<fill><patternFill patternType="gray125"/></fill></fills>'
            '<borders count="1"><border/></borders>'
            '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
            '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
            '</styleSheet>'
        ))
        archivo.writestr("xl/worksheets/sheet1.xml", hoja)
    salida.seek(0)
    return salida
