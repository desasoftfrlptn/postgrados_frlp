"""Casos de uso y reglas de negocio. No importa FastAPI ni SQLAlchemy."""

from datetime import datetime, timezone
from math import ceil
import re
from typing import Any, List
from uuid import UUID

from src.inscripcion.domain.estados import transicion_permitida
from src.inscripcion.domain.exceptions import (
    AccesoDenegado,
    CohorteNoEncontrada,
    ConflictoLegajo,
    InscripcionCerrada,
    LegajoNoEncontrado,
    ReglaNegocioInvalida,
    TransicionNoPermitida,
)
from src.inscripcion.domain.repository import LegajoRepository, CohorteRepository

from src.inscripcion.domain.entities import Cohorte


class LegajoService:
    def __init__(self, repository: LegajoRepository):
        self._repository = repository

    async def crear_legajo(self, datos: dict[str, Any], *, cohorte_autorizada=None):
        cohorte = await self._repository.obtener_cohorte(datos["cohorte_id"])
        if cohorte is None:
            raise CohorteNoEncontrada("La cohorte indicada no existe")
        if cohorte_autorizada is None or cohorte_autorizada != datos["cohorte_id"]:
            raise AccesoDenegado("Se requiere un enlace de inscripción válido para esta cohorte")
        if not cohorte.inscripcion_abierta:
            raise InscripcionCerrada("La inscripción para esta cohorte no está abierta")

        dni = datos["dni"].strip()
        if await self._repository.existe_dni_en_cohorte(datos["cohorte_id"], dni):
            raise ConflictoLegajo(
                "El DNI ingresado ya existe dos veces en la cohorte actual", "dni"
            )

        datos = dict(datos)
        datos["dni"] = dni
        datos["email"] = str(datos["email"]).lower()
        if datos.get("email_alternativo"):
            datos["email_alternativo"] = str(datos["email_alternativo"]).lower()
        datos.update(
            estado="BORRADOR",
            fecha_inscripcion=datetime.now(timezone.utc),
        )
        return await self._repository.crear(datos)

    async def listar_legajos(self, *, page: int, limit: int,
                             filtros: dict[str, Any]) -> dict[str, Any]:
        legajos, total = await self._repository.listar(
            offset=(page - 1) * limit,
            limit=limit,
            filtros=filtros,
        )
        return {
            "data": legajos,
            "page": page,
            "limit": limit,
            "total": total,
            "pages": ceil(total / limit) if total else 0,
        }

    async def obtener_legajo(self, legajo_id: UUID, *, usuario_email: str,
                             usuario_rol: str, usuario_id=None, enlace_legajo_id=None):
        legajo = await self._repository.obtener_por_id(legajo_id)
        if legajo is None:
            raise LegajoNoEncontrado("Legajo no encontrado")
        es_dueno = (usuario_id is not None and legajo.usuario_id == usuario_id)
        es_enlace = (enlace_legajo_id is not None and legajo.id == enlace_legajo_id)
        if usuario_rol.upper() != "COORDINADOR" and not es_dueno and not es_enlace:
            raise AccesoDenegado("No tiene permisos para consultar este legajo")
        return legajo

    async def cambiar_estado(self, legajo_id: UUID, *, nuevo_estado: str,
                             comentario: str | None, usuario_email: str,
                             usuario_rol: str):
        legajo = await self._repository.obtener_por_id(legajo_id)
        if legajo is None:
            raise LegajoNoEncontrado("Legajo no encontrado")

        rol = usuario_rol.upper()
        if rol != "COORDINADOR":
            raise AccesoDenegado("Solo un coordinador puede cambiar el estado del legajo")
        if not transicion_permitida(rol, legajo.estado, nuevo_estado):
            raise TransicionNoPermitida(
                f"Transición no permitida: {legajo.estado} → {nuevo_estado} para el rol {rol}"
            )
        if nuevo_estado == "OBSERVADO" and not (comentario and comentario.strip()):
            raise ReglaNegocioInvalida("Debe indicar el motivo de la observación")

        estado_anterior = legajo.estado
        legajo.estado = nuevo_estado
        if nuevo_estado == "ACTIVO":
            legajo.fecha_activacion = datetime.now(timezone.utc)
        if nuevo_estado == "COMPLETADO":
            legajo.numero_legajo = await self._generar_numero_legajo(legajo)

        token_activacion = None
        if nuevo_estado == "ACTIVO":
            token_activacion = await self._repository.preparar_cuenta_estudiante(legajo)

        await self._repository.agregar_auditoria(
            legajo_id=legajo.id,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            comentario=comentario,
            usuario_email=usuario_email,
        )
        legajo = await self._repository.guardar(legajo)
        return legajo, token_activacion

    async def _generar_numero_legajo(self, legajo) -> str:
        cohorte = await self._repository.obtener_cohorte(legajo.cohorte_id)
        coincidencias = re.findall(r"\d+", cohorte.nombre if cohorte else "")
        codigo_cohorte = int(coincidencias[-1]) if coincidencias else 1
        anio = cohorte.anio if cohorte else datetime.now().year
        correlativo = await self._repository.contar_numeros_legajo(legajo.cohorte_id) + 1
        return f"{anio % 100:02d}-{codigo_cohorte:03d}-{correlativo:03d}"

class CohorteService:
    def __init__(self, repository: CohorteRepository):
        self.repository = repository

    async def crear_cohorte(self, anio: int, nombre: str, fecha_inicio=None) -> Cohorte:
        nueva_cohorte = Cohorte(
            id=None,
            anio=anio,
            nombre=nombre,
            abierta=False,
            fecha_inicio=fecha_inicio
        )
        return await self.repository.crear(nueva_cohorte)
    
    async def listar_cohortes(self) -> List[Cohorte]:
        return await self.repository.obtener()
    
    async def gestionar_inscripcion(self, cohorte_id: UUID, abierta: bool) -> Cohorte:
        cohorte = await self.repository.obtener_por_id(cohorte_id)
        if not cohorte:
            raise ValueError("Cohorte no encontrada")

        if abierta:
            cohorte.abrir_inscripcion()
        else:
            cohorte.cerrar_inscripcion()

        return await self.repository.modificar(cohorte)
    
