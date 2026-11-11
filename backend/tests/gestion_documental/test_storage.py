import io
import unittest

from fastapi import HTTPException
from pypdf import PdfWriter

from src.gestion_documental.infrastructure.storage import validar_estructura_pdf


def crear_pdf(encriptado: bool = False) -> bytes:
    escritor = PdfWriter()
    escritor.add_blank_page(width=612, height=792)

    if encriptado:
        escritor.encrypt("clave123")

    archivo = io.BytesIO()
    escritor.write(archivo)
    return archivo.getvalue()


class TestValidarEstructuraPDF(unittest.TestCase):

    def test_acepta_pdf_valido(self):
        validar_estructura_pdf(crear_pdf())

    def test_rechaza_pdf_corrupto(self):
        with self.assertRaises(HTTPException) as contexto:
            validar_estructura_pdf(b"%PDF-1.7 archivo corrupto")

        self.assertEqual(contexto.exception.status_code, 400)

    def test_rechaza_pdf_encriptado(self):
        with self.assertRaises(HTTPException) as contexto:
            validar_estructura_pdf(crear_pdf(encriptado=True))

        self.assertEqual(contexto.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
