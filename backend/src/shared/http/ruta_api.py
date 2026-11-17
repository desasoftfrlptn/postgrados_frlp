from collections.abc import Awaitable, Callable
from datetime import datetime, timezone

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.routing import APIRoute
from pydantic import BaseModel


class ErrorRespuesta(BaseModel):
    statusCode: int
    error: str
    message: str
    field: str | None
    timestamp: str


class RutaAPI(APIRoute):
    def get_route_handler(self) -> Callable[[Request], Awaitable[Response]]:
        manejador = super().get_route_handler()

        async def manejar(solicitud: Request) -> Response:
            try:
                return await manejador(solicitud)
            except HTTPException as error:
                codigos = {
                    401: "UNAUTHORIZED",
                    403: "FORBIDDEN",
                    404: "NOT_FOUND",
                    409: "CONFLICT",
                    422: "VALIDATION_ERROR",
                }
                return JSONResponse(
                    status_code=error.status_code,
                    headers=error.headers,
                    content={
                        "statusCode": error.status_code,
                        "error": codigos.get(error.status_code, "HTTP_ERROR"),
                        "message": error.detail,
                        "field": None,
                        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    },
                )
            except RequestValidationError as error:
                ubicacion = error.errors()[0].get("loc", ())
                campo = ".".join(str(parte) for parte in ubicacion[1:]) or None
                return JSONResponse(
                    status_code=422,
                    content={
                        "statusCode": 422,
                        "error": "VALIDATION_ERROR",
                        "message": "Los datos enviados no son válidos",
                        "field": campo,
                        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    },
                )

        return manejar
