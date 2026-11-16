from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class MiddlewareEncabezadosSeguridad(BaseHTTPMiddleware):
    async def dispatch(
        self,
        solicitud: Request,
        continuar: RequestResponseEndpoint,
    ) -> Response:
        respuesta = await continuar(solicitud)
        respuesta.headers.setdefault("X-Content-Type-Options", "nosniff")
        respuesta.headers.setdefault("X-Frame-Options", "DENY")
        respuesta.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self' 'unsafe-inline' "
            "https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' "
            "https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self'; "
            "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
        )
        if solicitud.url.scheme == "https":
            respuesta.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return respuesta
