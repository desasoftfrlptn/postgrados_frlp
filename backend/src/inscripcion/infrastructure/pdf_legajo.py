"""Ficha PDF del legajo, generada con los datos consultados en la base."""
from datetime import date, datetime, timezone
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

TIPOS = {"DNI": "DNI", "TITULO_GRADO": "Titulo de grado", "PARTIDA": "Partida de nacimiento",
         "CUIT_CUIL": "Constancia de CUIT/CUIL", "FORM_INSCRIPCION": "Formulario de inscripcion",
         "FORM_BECA": "Formulario de beca", "TITULO_POSGRADO": "Titulo de posgrado"}


def generar_pdf_legajo(legajo: dict, cohorte: str, documentos: list[dict], trabajo: dict | None) -> bytes:
    salida = BytesIO()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="DatoLegajo", parent=styles["BodyText"], fontSize=9, leading=13,
                             wordWrap="CJK", spaceAfter=0))
    styles.add(ParagraphStyle(name="EtiquetaLegajo", parent=styles["DatoLegajo"], fontName="Helvetica-Bold"))
    ancho = A4[0] - 36 * mm
    def texto(value):
        if value is None or value == "": return "No disponible"
        if isinstance(value, (datetime, date)): return value.strftime("%d/%m/%Y")
        return str(value)
    def par(value, estilo="DatoLegajo"):
        return Paragraph(escape(texto(value)).replace("\n", "<br/>"), styles[estilo])
    elementos = [Paragraph("Fénix Posgrado", styles["Title"]),
                 Paragraph("Ficha de legajo", styles["Heading1"])]
    def seccion(titulo, filas):
        elementos.append(Paragraph(titulo, styles["Heading2"]))
        tabla = Table([[par(label, "EtiquetaLegajo"), par(value)] for label, value in filas],
                      colWidths=[48*mm, ancho-48*mm], hAlign="LEFT", splitInRow=1)
        tabla.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP"),
            ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#eef2ff")),
            ("BOTTOMPADDING", (0,0), (-1,-1), 6), ("TOPPADDING", (0,0), (-1,-1), 6),
            ("LINEBELOW", (0,0), (-1,-1), 0.3, colors.HexColor("#dddddd"))]))
        elementos.extend([tabla, Spacer(1, 3*mm)])
    seccion("Inscripción", [("Identificador",legajo["id"]), ("Número de legajo",legajo["numero_legajo"]),
        ("Cohorte",cohorte), ("Estado",legajo["estado"]), ("Semáforo",legajo["semaforo"]),
        ("Fecha de inscripción",legajo["fecha_inscripcion"]), ("Fecha de activación",legajo["fecha_activacion"])])
    seccion("Datos personales", [("Apellido y nombre",f"{legajo['apellido']}, {legajo['nombre']}"),
        ("DNI",legajo["dni"]), ("Correo electrónico",legajo["email"]),
        ("Correo alternativo",legajo["email_alternativo"]), ("Teléfono móvil",legajo["telefono_movil"]),
        ("Dirección",legajo["domicilio_direccion"]), ("Ciudad",legajo["domicilio_ciudad"]),
        ("Provincia",legajo["domicilio_provincia"]), ("País",legajo["domicilio_pais"])])
    seccion("Datos académicos", [("Carrera",legajo["carrera_elegida"]), ("Tipo de carrera",legajo["tipo_carrera"]),
        ("Título de grado",legajo["titulo_grado"]), ("Título de posgrado",legajo["titulo_posgrado"]),
        ("Solicita beca","Sí" if legajo["solicita_beca"] else "No"), ("Tipo de beca",legajo["tipo_beca"])])
    elementos.extend([Paragraph("Motivación", styles["Heading2"]), par(legajo["motivacion"])])
    elementos.append(Paragraph("Documentación vigente", styles["Heading2"]))
    if documentos:
        filas = [[par(v,"EtiquetaLegajo") for v in ["Documento", "Archivo", "Estado / motivo"]]]
        for documento in documentos:
            estado = documento["estado"]
            if documento.get("motivo_observacion"):
                estado += "\n" + documento["motivo_observacion"]
            filas.append([par(TIPOS[documento["tipo"]]), par(documento["nombre_original"]), par(estado)])
        tabla = LongTable(filas, colWidths=[43*mm,64*mm,ancho-107*mm], repeatRows=1, hAlign="LEFT", splitInRow=1)
        tabla.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#eef2ff")),
            ("GRID",(0,0),(-1,-1),0.3,colors.HexColor("#dddddd")),
            ("BOTTOMPADDING",(0,0),(-1,-1),6), ("TOPPADDING",(0,0),(-1,-1),6)]))
        elementos.append(tabla)
    else:
        elementos.append(par("No hay documentos cargados."))
    if trabajo:
        seccion("Trabajo final", [("Tipo",trabajo["tipo"]), ("Título",trabajo["titulo"]),
            ("Director",trabajo["director"]), ("Codirector",trabajo["codirector"]),
            ("Fecha CPR",trabajo["fecha_cpr"]), ("Resolución",trabajo["numero_resolucion"])])
    def pie(canvas, doc):
        canvas.saveState(); canvas.setFont("Helvetica",8)
        canvas.drawString(18*mm,12*mm,"Generado (UTC): " + datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M"))
        canvas.drawRightString(A4[0]-18*mm,12*mm,f"Página {doc.page}");canvas.restoreState()
    SimpleDocTemplate(salida,pagesize=A4,leftMargin=18*mm,rightMargin=18*mm,topMargin=16*mm,bottomMargin=20*mm,
        title="Ficha de legajo",author="Fenix Posgrado").build(elementos,onFirstPage=pie,onLaterPages=pie)
    return salida.getvalue()
