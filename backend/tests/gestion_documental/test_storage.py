import io
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from pypdf import PdfWriter

from src.gestion_documental.infrastructure.storage import (
    analizar_con_antivirus,
    validar_estructura_pdf,
)


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


class TestAnalizarConAntivirus(unittest.TestCase):

    @patch("src.gestion_documental.infrastructure.storage.clamd.ClamdNetworkSocket")
    def test_acepta_archivo_limpio(self, mock_clamd):
        mock_clamd.return_value.instream.return_value = {
            "stream": ("OK", None)
        }

        analizar_con_antivirus(b"archivo de prueba")

    @patch("src.gestion_documental.infrastructure.storage.clamd.ClamdNetworkSocket")
    def test_rechaza_archivo_infectado(self, mock_clamd):
        mock_clamd.return_value.instream.return_value = {
            "stream": ("FOUND", "Eicar-Test-Signature")
        }

        with self.assertRaises(HTTPException) as contexto:
            analizar_con_antivirus(b"archivo infectado")

        self.assertEqual(contexto.exception.status_code, 400)

    @patch("src.gestion_documental.infrastructure.storage.clamd.ClamdNetworkSocket")
    def test_rechaza_si_antivirus_no_disponible(self, mock_clamd):
        mock_clamd.side_effect = ConnectionError("ClamAV desconectado")

        with self.assertRaises(HTTPException) as contexto:
            analizar_con_antivirus(b"archivo de prueba")

        self.assertEqual(contexto.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()