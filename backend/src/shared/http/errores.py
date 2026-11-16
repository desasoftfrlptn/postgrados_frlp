from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class ErrorAplicacion(Exception):
    def __init__(self, *, codigo: str, mensaje: str, codigo_http: int) -> None:
        super().__init__(mensaje)
        self.codigo = codigo
        self.mensaje = mensaje
        self.codigo_http = codigo_http


async def manejar_error_aplicacion(
    _: Request,
    excepcion: ErrorAplicacion,
) -> JSONResponse:
    return JSONResponse(
        status_code=excepcion.codigo_http,
        content={"code": excepcion.codigo, "detail": excepcion.mensaje},
    )


def registrar_manejador_error_aplicacion(app: FastAPI) -> None:
    app.add_exception_handler(ErrorAplicacion, manejar_error_aplicacion)
