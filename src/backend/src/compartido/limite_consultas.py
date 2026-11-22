from collections import deque
from math import ceil
from threading import Lock
from time import monotonic

from fastapi import HTTPException


VENTANA_SEGUNDOS = 600
MAXIMO_POR_IP = 3
MAXIMO_GLOBAL = 30

intentos_por_ip: dict[str, deque[float]] = {}
intentos_globales: deque[float] = deque()

bloqueo = Lock()


def limpiar_intentos(
    intentos: deque[float],
    ahora: float,
) -> None:
    while (
        intentos
        and ahora - intentos[0] >= VENTANA_SEGUNDOS
    ):
        intentos.popleft()


def validar_limite_consultas(ip: str) -> None:
    with bloqueo:
        ahora = monotonic()

        limpiar_intentos(intentos_globales, ahora)

        for direccion in list(intentos_por_ip):
            historial = intentos_por_ip[direccion]

            limpiar_intentos(historial, ahora)

            if not historial:
                del intentos_por_ip[direccion]

        historial = intentos_por_ip.get(ip, deque())

        for intentos, maximo in (
            (historial, MAXIMO_POR_IP),
            (intentos_globales, MAXIMO_GLOBAL),
        ):
            if len(intentos) >= maximo:
                espera = max(
                    1,
                    ceil(
                        VENTANA_SEGUNDOS
                        - (ahora - intentos[0])
                    ),
                )

                raise HTTPException(
                    status_code=429,
                    detail=(
                        "Se alcanzo el limite de consultas. "
                        "Intenta nuevamente mas tarde."
                    ),
                    headers={
                        "Retry-After": str(espera),
                    },
                )

        historial.append(ahora)
        intentos_por_ip[ip] = historial
        intentos_globales.append(ahora)
