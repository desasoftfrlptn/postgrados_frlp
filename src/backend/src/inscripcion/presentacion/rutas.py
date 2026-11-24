from pydantic import ValidationError
from src.inscripcion.aplicacion.notificaciones import (
    encolar_confirmacion_inscripcion,
)

import hashlib
import json
import os
from src.inscripcion.aplicacion.validar_duplicados import (
    validar_inscripcion_no_duplicada,
)
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from typing import Literal
from urllib.parse import urlencode, urlsplit
from jose import JWTError, jwt
from pydantic import BaseModel, ConfigDict, Field
from src.usuarios.servicio import SECRET_KEY, ALGORITHM

from pydantic import EmailStr

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    Response,
)

from src.inscripcion.infraestructura.documentos_modelos import (
    DocumentoLegajoORM,
)

from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.carreras.modelos import CarreraORM
from src.compartido.conexion import get_db
from src.compartido.documentos import normalizar_documento
from src.conduccion import servicio as servicio_conduccion
from src.conduccion.esquemas import AccionLegajoPeticion
from src.conduccion.modelos import GestionLegajoORM, AuditoriaConduccionORM
from src.conduccion.reglas import AccionLegajo

from src.inscripcion.aplicacion.consultar_documentacion import (
    consultar_documentacion_legajo,
)
from src.inscripcion.aplicacion.listar_legajos import (
    listar_legajos,
)
from src.inscripcion.infraestructura.cohortes_modelos import (
    CohorteORM,
)
from src.inscripcion.infraestructura.orm_modelos import LegajoORM
from src.inscripcion.infraestructura.repositorio import (
    LegajoRepositorioPostgres,
)
from src.inscripcion.presentacion.esquemas import (
    DocumentacionLegajoRespuesta,
    EstadoInscripcionRespuesta,
    LegajoActualizarPerfil,
    LegajoCrear,
    LegajoRespuesta,
)
from src.usuarios.modelos import UsuarioORM
from src.usuarios.rutas import administrador_actual, usuario_actual
from src.alertas.rutas import router as router_alertas
from src.alertas.servicio import alertar_rol
from src.tesis.rutas import router as router_tesis
from src.trabajos_practicos.rutas import router as router_trabajos_practicos


enrutador = APIRouter(
    prefix="/api/v1/inscripcion",
    tags=["Inscripción"],
)

CARPETA_DOCUMENTOS = (
    Path(os.getenv("STORAGE_PATH", "storage_privado"))
    / "legajos"
)

TAMANIO_MAXIMO_PDF = 5 * 1024 * 1024

async def validar_pdf(
    archivo: UploadFile | None,
    nombre_documento: str,
    obligatorio: bool = True,
) -> bytes | None:
    if archivo is None:
        if obligatorio:
            raise HTTPException(
                status_code=422,
                detail=f"Falta adjuntar: {nombre_documento}.",
            )
        return None

    if archivo.content_type != "application/pdf":
        raise HTTPException(
            status_code=422,
            detail=f"{nombre_documento} debe ser un archivo PDF.",
        )

    contenido = await archivo.read(TAMANIO_MAXIMO_PDF + 1)

    if len(contenido) > TAMANIO_MAXIMO_PDF:
        raise HTTPException(
            status_code=422,
            detail=f"{nombre_documento} supera el límite de 5 MB.",
        )

    if not contenido.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=422,
            detail=f"El archivo de {nombre_documento} no es un PDF válido.",
        )

    return contenido

def guardar_pdf(
    contenido: bytes,
    legajo_id: UUID,
    tipo: str,
) -> tuple[str, str]:
    carpeta = CARPETA_DOCUMENTOS / str(legajo_id)

    carpeta.mkdir(
        parents=True,
        exist_ok=True,
    )

    nombre_archivo = f"{tipo}_{uuid4()}.pdf"
    ruta_archivo = carpeta / nombre_archivo

    ruta_archivo.write_bytes(contenido)

    checksum = hashlib.sha256(contenido).hexdigest()

    return str(ruta_archivo), checksum

async def coordinador_actual(
    usuario: UsuarioORM = Depends(usuario_actual),
) -> UsuarioORM:
    if (
        not usuario.activo
        or usuario.rol is None
        or usuario.rol.nombre != "COORDINADOR"
    ):
        raise HTTPException(
            status_code=403,
            detail="Se requieren permisos de coordinador.",
        )

    return usuario



@enrutador.post(
    "/",
    response_model=LegajoRespuesta,
    status_code=201,
)
async def inscribir_aspirante(
    cohorte_id: UUID = Form(...),
    carrera_elegida: str = Form(...),
    apellido: str = Form(...),
    nombre: str = Form(...),
    nacionalidad: str = Form(...),
    dni_pasaporte: str = Form(...),
    correo_electronico: EmailStr = Form(...),
    telefono_movil: str = Form(...),
    correo_alternativo: EmailStr | None = Form(None),
    domicilio: str = Form(...),
    pais: str = Form(...),
    provincia: str = Form(...),
    ciudad: str = Form(...),
    titulo_anterior: str = Form(...),
    universidad_anterior: str = Form(...),
    forma_conocio_ofertas: str = Form(...),
    motivos_cursar: str = Form(...),
    solicitud_beca: Literal["30", "100"] | None = Form(None),

    formularioPreinscripcion: UploadFile = File(...),
    formularioInscripcion: UploadFile = File(...),
    dniPasaporte: UploadFile = File(...),
    partidaNacimiento: UploadFile = File(...),
    constanciaCuitCuil: UploadFile = File(...),
    tituloGrado: UploadFile = File(...),
    tituloPosgrado: UploadFile | None = File(None),
    formularioBeca: UploadFile | None = File(None),

    db: AsyncSession = Depends(get_db),
):
    try:
        datos = LegajoCrear(
            cohorte_id=cohorte_id,
            carrera_elegida=carrera_elegida,
            apellido=apellido,
            nombre=nombre,
            nacionalidad=nacionalidad,
            dni_pasaporte=dni_pasaporte,
            correo_electronico=correo_electronico,
            telefono_movil=telefono_movil,
            correo_alternativo=correo_alternativo,
            domicilio=domicilio,
            pais=pais,
            provincia=provincia,
            ciudad=ciudad,
            titulo_anterior=titulo_anterior,
            universidad_anterior=universidad_anterior,
            forma_conocio_ofertas=forma_conocio_ofertas,
            motivos_cursar=motivos_cursar,
            solicitud_beca=(
                int(solicitud_beca)
                if solicitud_beca is not None
                else None
            ),
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=exc.errors(include_context=False, include_input=False),
        ) from exc

    # Validar los ocho documentos antes de iniciar el registro.
    archivos = {
        "FORMULARIO_PREINSCRIPCION": await validar_pdf(
            formularioPreinscripcion,
            "Formulario de preinscripción",
        ),
        "FORMULARIO_INSCRIPCION": await validar_pdf(
            formularioInscripcion,
            "Formulario de inscripción",
        ),
        "DNI_PASAPORTE": await validar_pdf(
            dniPasaporte,
            "DNI o pasaporte",
        ),
        "PARTIDA_NACIMIENTO": await validar_pdf(
            partidaNacimiento,
            "Partida de nacimiento",
        ),
        "CONSTANCIA_CUIT_CUIL": await validar_pdf(
            constanciaCuitCuil,
            "Constancia CUIT/CUIL",
        ),
        "TITULO_GRADO": await validar_pdf(
            tituloGrado,
            "Título de grado",
        ),
        "TITULO_POSGRADO": await validar_pdf(
            tituloPosgrado,
            "Título de posgrado",
            obligatorio=False,
        ),
        "FORMULARIO_BECA": await validar_pdf(
            formularioBeca,
            "Formulario de beca",
            obligatorio=solicitud_beca is not None,
        ),
    }

    # Comprobar cohorte.
    resultado = await db.execute(
        select(CohorteORM)
        .where(CohorteORM.id == datos.cohorte_id)
        .with_for_update()
    )
    cohorte = resultado.scalar_one_or_none()

    if cohorte is None:
        raise HTTPException(
            status_code=404,
            detail="La cohorte seleccionada no existe.",
        )

    if not cohorte.abierta:
        raise HTTPException(
            status_code=422,
            detail="La inscripción a esta cohorte está cerrada.",
        )

    # Comprobar carrera.
    carrera = await db.get(CarreraORM, cohorte.carrera_id)

    if carrera is None or not carrera.activo:
        raise HTTPException(
            status_code=422,
            detail="La carrera de la cohorte no está disponible.",
        )

    if datos.carrera_elegida.strip() != carrera.nombre.strip():
        raise HTTPException(
            status_code=422,
            detail="La carrera elegida no corresponde a la cohorte.",
        )

    # Comprobar correo duplicado.
    await validar_inscripcion_no_duplicada(
        db=db,
        correo_electronico=datos.correo_electronico,
        dni_pasaporte=datos.dni_pasaporte,
        cohorte_id=datos.cohorte_id,
    )

    # Comprobar cupo.
    cantidad = await db.scalar(
        select(func.count(LegajoORM.id)).where(
            LegajoORM.cohorte_id == datos.cohorte_id
        )
    )

    if cantidad >= 500:
        raise HTTPException(
            status_code=409,
            detail="La cohorte alcanzó el cupo máximo de 500 aspirantes.",
        )

    anio = datetime.now(
        ZoneInfo("America/Argentina/Buenos_Aires")
    ).year

    correo_administracion = os.getenv("ADMIN_EMAIL", "").strip()

    if not correo_administracion:
        raise HTTPException(
            status_code=503,
            detail="El servicio de inscripción no está configurado.",
    )

    archivos_guardados = []

    try:
        # Generar número de seguimiento.
        resultado_contador = await db.execute(
            text(
                """
                INSERT INTO contadores_inscripcion (
                    anio,
                    ultimo_numero
                )
                VALUES (:anio, 1)
                ON CONFLICT (anio)
                DO UPDATE SET
                    ultimo_numero =
                        contadores_inscripcion.ultimo_numero + 1
                RETURNING ultimo_numero
                """
            ),
            {"anio": anio},
        )

        correlativo = resultado_contador.scalar_one()

        nuevo_legajo = LegajoORM(
            **datos.model_dump(),
            numero_seguimiento=f"INS-{anio}-{correlativo}",
            estado="PENDIENTE",
        )

        db.add(nuevo_legajo)

        await db.flush()

        for tipo, contenido in archivos.items():
            if contenido is None:
                continue

            ruta, checksum = guardar_pdf(
                contenido,
                nuevo_legajo.id,
                tipo,
            )

            archivos_guardados.append(ruta)

            documento = DocumentoLegajoORM(
                legajo_id=nuevo_legajo.id,
                tipo=tipo,
                path=ruta,
                checksum=checksum,
            )

            db.add(documento)
            if tipo == "FORMULARIO_INSCRIPCION":
                await db.flush()

                servicio_conduccion.encolar_correo(
                    db,
                    destinatario=correo_administracion,
                    asunto=(
                        f"Nueva inscripción "
                        f"{nuevo_legajo.numero_seguimiento}"
                    ),
                    contenido=(
                        f"Aspirante: {nuevo_legajo.apellido}, "
                        f"{nuevo_legajo.nombre}\n"
                        f"Carrera: {nuevo_legajo.carrera_elegida}\n"
                        f"Seguimiento: "
                        f"{nuevo_legajo.numero_seguimiento}\n\n"
                        "Se adjunta el formulario de inscripción."
                    ),
                    documento_id=documento.id,
                )

        # Registrar la notificacion en la misma transaccion.
        encolar_confirmacion_inscripcion(db, nuevo_legajo)
        await alertar_rol(db, "COORDINADOR", "Nueva inscripción",
            f"Inscripción {nuevo_legajo.numero_seguimiento} pendiente de revisión.",
            f"/dashboard/conduccion/legajos/{nuevo_legajo.id}")

        # Confirmar legajo, documentos y notificacion juntos.
        await db.commit()

    except IntegrityError as exc:
        await db.rollback()

        for ruta in archivos_guardados:
            Path(ruta).unlink(missing_ok=True)

        raise HTTPException(
            status_code=409,
            detail="La inscripción ya existe o contiene datos duplicados.",
        ) from exc

    except Exception:
        await db.rollback()

        for ruta in archivos_guardados:
            Path(ruta).unlink(missing_ok=True)

        raise

    await db.refresh(nuevo_legajo)

    return nuevo_legajo



@enrutador.get(
    "/",
    response_model=list[LegajoRespuesta],
)
async def listar_legajos_conduccion(
    dni: str | None = None,
    apellido: str | None = None,
    carrera: str | None = None,
    estado: str | None = None,
    cohorte_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(coordinador_actual),
):
    repositorio = LegajoRepositorioPostgres(db)

    return await listar_legajos(
        repositorio=repositorio,
        dni=dni,
        apellido=apellido,
        carrera=carrera,
        estado=estado,
        cohorte_id=cohorte_id,
    )


# Indicadores agregados: no expone datos personales de los legajos.
@enrutador.get("/resumen-administrativo", response_model=dict[str, int])
async def resumen_administrativo(
    db: AsyncSession = Depends(get_db),
    _administrador=Depends(administrador_actual),
):
    filas = await db.execute(
        select(LegajoORM.estado, func.count(LegajoORM.id))
        .group_by(LegajoORM.estado)
    )
    return {estado: cantidad for estado, cantidad in filas.all()}


@enrutador.get("/estadisticas-administrativas", response_model=dict[str, dict[str, int]])
async def estadisticas_administrativas(
    carrera_id: UUID | None = None, cohorte_id: UUID | None = None,
    anio: int | None = None, rol: str | None = None, estado_legajo: str | None = None,
    db: AsyncSession = Depends(get_db), _admin=Depends(administrador_actual),
):
    from src.usuarios.modelos import RolORM
    from src.seminarios.infraestructura.orm_modelos import SeminarioORM, InscripcionSeminarioORM
    from src.tutorias.modelos import TutoriaORM, EncuentroORM
    from src.tesis.modelos import TesisORM
    from src.trabajos_practicos.modelos import TrabajoPracticoORM

    cohortes = select(CohorteORM.id)
    if carrera_id is not None:
        cohortes = cohortes.where(CohorteORM.carrera_id == carrera_id)
    if cohorte_id is not None:
        cohortes = cohortes.where(CohorteORM.id == cohorte_id)
    if anio is not None:
        cohortes = cohortes.where(CohorteORM.anio == anio)
    filtro_academico = any(v is not None for v in (carrera_id, cohorte_id, anio))
    legajos = select(LegajoORM.id)
    if filtro_academico:
        legajos = legajos.where(LegajoORM.cohorte_id.in_(cohortes))
    if estado_legajo is not None:
        legajos = legajos.where(LegajoORM.estado == estado_legajo)
    carreras = select(CarreraORM.id)
    if carrera_id is not None:
        carreras = carreras.where(CarreraORM.id == carrera_id)
    if cohorte_id is not None or anio is not None:
        carreras = carreras.where(CarreraORM.id.in_(select(CohorteORM.carrera_id).where(CohorteORM.id.in_(cohortes))))
    seminarios = select(SeminarioORM.id).where(SeminarioORM.carrera_id.in_(carreras))
    usuarios = select(UsuarioORM.id).join(RolORM, UsuarioORM.rol_id == RolORM.id)
    if rol:
        usuarios = usuarios.where(RolORM.nombre == rol)

    async def contar(modelo, *filtros):
        return int(await db.scalar(select(func.count()).select_from(modelo).where(*filtros)) or 0)

    async def agrupar(columna, modelo, *filtros):
        filas = await db.execute(select(columna, func.count()).select_from(modelo).where(*filtros).group_by(columna))
        return dict(filas.all())

    estados = await agrupar(LegajoORM.estado, LegajoORM, LegajoORM.id.in_(legajos))
    roles = await db.execute(select(RolORM.nombre, func.count(UsuarioORM.id)).select_from(RolORM).join(UsuarioORM, UsuarioORM.rol_id == RolORM.id).where(UsuarioORM.id.in_(usuarios)).group_by(RolORM.nombre))
    estados_cursada = await agrupar(InscripcionSeminarioORM.estado, InscripcionSeminarioORM, InscripcionSeminarioORM.legajo_id.in_(legajos), InscripcionSeminarioORM.seminario_id.in_(seminarios))
    tutorias = select(TutoriaORM.id).where(TutoriaORM.legajo_id.in_(legajos))
    return {
        "usuarios": {"Activos": await contar(UsuarioORM, UsuarioORM.id.in_(usuarios), UsuarioORM.activo.is_(True)), "Inactivos": await contar(UsuarioORM, UsuarioORM.id.in_(usuarios), UsuarioORM.activo.is_(False))},
        "roles": dict(roles.all()),
        "docentes": {"Activos": await contar(UsuarioORM, UsuarioORM.rol_id.in_(select(RolORM.id).where(RolORM.nombre == "DOCENTE")), UsuarioORM.activo.is_(True)), "Inactivos": await contar(UsuarioORM, UsuarioORM.rol_id.in_(select(RolORM.id).where(RolORM.nombre == "DOCENTE")), UsuarioORM.activo.is_(False))},
        "admisiones": estados,
        "aspirantes": {k: v for k, v in estados.items() if k in ("BORRADOR", "PENDIENTE", "EN_REVISION", "OBSERVADO", "COMPLETADO", "RECHAZADO", "VENCIDO")},
        "estudiantes": {k: v for k, v in estados.items() if k in ("ACTIVO", "EN_RIESGO", "GRADUADO", "BAJA")},
        "becas": {"Con solicitud": await contar(LegajoORM, LegajoORM.id.in_(legajos), LegajoORM.solicitud_beca.is_not(None)), "Sin solicitud": await contar(LegajoORM, LegajoORM.id.in_(legajos), LegajoORM.solicitud_beca.is_(None))},
        "carreras": {"Activas": await contar(CarreraORM, CarreraORM.id.in_(carreras), CarreraORM.activo.is_(True)), "Inactivas": await contar(CarreraORM, CarreraORM.id.in_(carreras), CarreraORM.activo.is_(False))},
        "tipos": await agrupar(CarreraORM.tipo, CarreraORM, CarreraORM.id.in_(carreras)),
        "cohortes": {"Abiertas": await contar(CohorteORM, CohorteORM.id.in_(cohortes), CohorteORM.abierta.is_(True)), "Cerradas": await contar(CohorteORM, CohorteORM.id.in_(cohortes), CohorteORM.abierta.is_(False))},
        "seminarios": {"Activos": await contar(SeminarioORM, SeminarioORM.id.in_(seminarios), SeminarioORM.activo.is_(True)), "Inactivos": await contar(SeminarioORM, SeminarioORM.id.in_(seminarios), SeminarioORM.activo.is_(False))},
        "cursadas": estados_cursada,
        "tutorias": {"Activas": await contar(TutoriaORM, TutoriaORM.id.in_(tutorias), TutoriaORM.activa.is_(True)), "Inactivas": await contar(TutoriaORM, TutoriaORM.id.in_(tutorias), TutoriaORM.activa.is_(False))},
        "encuentros": await agrupar(EncuentroORM.estado, EncuentroORM, EncuentroORM.tutoria_id.in_(tutorias)),
        "trabajos": {"Activos": await contar(TrabajoPracticoORM, TrabajoPracticoORM.legajo_id.in_(legajos), TrabajoPracticoORM.activo.is_(True)), "Inactivos": await contar(TrabajoPracticoORM, TrabajoPracticoORM.legajo_id.in_(legajos), TrabajoPracticoORM.activo.is_(False))},
        "tesis": {"Aprobadas": await contar(TesisORM, TesisORM.legajo_id.in_(legajos), TesisORM.fecha_aprobacion.is_not(None)), "Pendientes": await contar(TesisORM, TesisORM.legajo_id.in_(legajos), TesisORM.fecha_aprobacion.is_(None))},
    }


@enrutador.get(
    "/mi-legajo",
    response_model=LegajoRespuesta,
)
async def obtener_mi_legajo(
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(usuario_actual),
):
    repositorio = LegajoRepositorioPostgres(db)

    legajo = await repositorio.obtener_por_email_o_dni(
        email=usuario.correo_electronico,
        dni=usuario.dni,
    )

    if legajo is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró el legajo.",
        )

    return legajo


@enrutador.patch(
    "/mi-legajo",
    response_model=LegajoRespuesta,
)
async def actualizar_mi_legajo(
    datos: LegajoActualizarPerfil,
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(usuario_actual),
):
    repositorio = LegajoRepositorioPostgres(db)

    legajo_entidad = await repositorio.obtener_por_email_o_dni(
        email=usuario.correo_electronico,
        dni=usuario.dni,
    )

    if legajo_entidad is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró el legajo.",
        )

    async def actualizar():
        legajo_orm = await db.scalar(
            select(LegajoORM)
            .where(
                LegajoORM.id == legajo_entidad.id,
                func.lower(LegajoORM.correo_electronico) == usuario.correo_electronico.strip().lower(),
                LegajoORM.dni_pasaporte == normalizar_documento(usuario.dni),
                LegajoORM.estado.in_(("ACTIVO", "EN_RIESGO")),
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )

        if legajo_orm is None:
            raise HTTPException(
                status_code=404,
                detail="No se encontró el legajo.",
            )

        hubo_cambios = False

        for campo, valor in datos.model_dump(
            exclude_unset=True
        ).items():
            if (
                valor is not None
                and getattr(legajo_orm, campo) != valor
            ):
                setattr(legajo_orm, campo, valor)
                hubo_cambios = True

        if hubo_cambios:
            gestion = await db.get(
                GestionLegajoORM,
                legajo_orm.id,
            )

            if gestion is not None:
                verificacion_anterior = gestion.datos_verificados
                gestion.datos_verificados = False

                servicio_conduccion.registrar_auditoria(
                    db,
                    legajo_id=legajo_orm.id,
                    accion="INVALIDAR_VERIFICACION_POR_EDICION",
                    usuario=usuario,
                    anterior={
                        "datos_verificados": verificacion_anterior,
                    },
                    nuevo={"datos_verificados": False},
                )

        return legajo_orm

    legajo_actualizado = await servicio_conduccion.ejecutar_transaccion(
        db,
        actualizar,
    )

    await db.refresh(legajo_actualizado)
    return legajo_actualizado

@enrutador.get(
    "/seguimiento/{numero_seguimiento}",
    response_model=EstadoInscripcionRespuesta,
)
async def consultar_estado_inscripcion(
    numero_seguimiento: str,
    dni_pasaporte: str,
    db: AsyncSession = Depends(get_db),
):
    legajo = await db.scalar(
        select(LegajoORM).where(
            LegajoORM.numero_seguimiento == numero_seguimiento.strip().upper(),
            LegajoORM.dni_pasaporte == normalizar_documento(dni_pasaporte),
        )
    )

    if legajo is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró una inscripción con esos datos.",
        )

    gestion = await db.get(GestionLegajoORM, legajo.id)

    return EstadoInscripcionRespuesta(
        numero_seguimiento=legajo.numero_seguimiento,
        estado=legajo.estado,
        observaciones=gestion.observaciones if gestion else None,
        documentacion_a_corregir=(
            gestion.documentacion_a_corregir if gestion else []
        ),
    )

# Corrección de una inscripción existente, previa verificación por correo.
CAMPOS_CORRECCION = (
    "apellido", "nombre", "nacionalidad", "telefono_movil", "correo_alternativo",
    "domicilio", "pais", "provincia", "ciudad", "titulo_anterior",
    "universidad_anterior", "forma_conocio_ofertas", "motivos_cursar",
)
TIPOS_CORRECCION = {
    "FORMULARIO_PREINSCRIPCION", "FORMULARIO_INSCRIPCION", "DNI_PASAPORTE",
    "PARTIDA_NACIMIENTO", "CONSTANCIA_CUIT_CUIL", "TITULO_GRADO",
    "TITULO_POSGRADO", "FORMULARIO_BECA",
}


class SolicitarCorreccion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    numero_seguimiento: str = Field(min_length=1, max_length=30)
    dni_pasaporte: str = Field(min_length=1, max_length=100)


class TokenCorreccion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(min_length=1, max_length=4096)


async def ultimo_evento_correccion(db, legajo_id):
    return await db.scalar(select(AuditoriaConduccionORM).where(
        AuditoriaConduccionORM.recurso_id == legajo_id,
        AuditoriaConduccionORM.recurso_tipo == "LEGAJO",
        AuditoriaConduccionORM.accion.in_(("OBSERVAR", "SOLICITAR_CORRECCION", "REENVIAR_INSCRIPCION")),
    ).order_by(AuditoriaConduccionORM.fecha.desc(), AuditoriaConduccionORM.id.desc()).limit(1))


@enrutador.post("/seguimiento/solicitar-correccion")
async def solicitar_correccion(datos: SolicitarCorreccion, db: AsyncSession = Depends(get_db)):
    legajo = await db.scalar(select(LegajoORM).where(
        LegajoORM.numero_seguimiento == datos.numero_seguimiento.strip().upper(),
        LegajoORM.dni_pasaporte == normalizar_documento(datos.dni_pasaporte),
        LegajoORM.estado == "OBSERVADO",
    ).with_for_update())
    mensaje = {"message": "Si la inscripción está observada, recibirás un enlace en el correo registrado."}
    if legajo is None:
        return mensaje
    ultimo = await ultimo_evento_correccion(db, legajo.id)
    ahora = datetime.now(timezone.utc)
    if ultimo and ultimo.accion == "SOLICITAR_CORRECCION" and ahora - ultimo.fecha < timedelta(minutes=2):
        return mensaje
    base = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    if not base and os.getenv("ENVIRONMENT") == "development":
        base = "http://localhost:3000"
    url = urlsplit(base)
    if (not url.hostname or url.username or url.password or url.query or url.fragment
            or (url.scheme != "https" and not (url.scheme == "http" and url.hostname in {"localhost", "127.0.0.1"}))):
        raise HTTPException(503, "El envío de enlaces no está configurado.")
    evento = servicio_conduccion.registrar_auditoria(db, legajo_id=legajo.id, accion="SOLICITAR_CORRECCION")
    await db.flush()
    token = jwt.encode({"sub": str(legajo.id), "finalidad": "corregir_inscripcion",
        "solicitud": str(evento.id), "exp": ahora + timedelta(hours=24)}, SECRET_KEY, algorithm=ALGORITHM)
    enlace = f"{base}/estado-inscripcion#{urlencode({'correccion': token})}"
    servicio_conduccion.encolar_correo(db, destinatario=legajo.correo_electronico,
        asunto="Corrección de inscripción", contenido=f"Podés corregir tu inscripción desde este enlace, válido por 24 horas:\n{enlace}")
    await db.commit()
    return mensaje


async def obtener_inscripcion_correccion(db, token, bloquear=False):
    try:
        datos = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"require_exp": True, "require_sub": True})
        if datos.get("finalidad") != "corregir_inscripcion":
            raise ValueError()
        legajo_id = UUID(datos["sub"])
        solicitud_id = UUID(datos["solicitud"])
    except (JWTError, ValueError, KeyError, TypeError):
        raise HTTPException(400, "El enlace no es válido o ha vencido.")
    consulta = select(LegajoORM).where(LegajoORM.id == legajo_id, LegajoORM.estado == "OBSERVADO")
    if bloquear:
        consulta = consulta.with_for_update()
    legajo = await db.scalar(consulta)
    ultimo = await ultimo_evento_correccion(db, legajo_id)
    if not legajo or not ultimo or ultimo.id != solicitud_id or ultimo.accion != "SOLICITAR_CORRECCION":
        raise HTTPException(409, "La inscripción cambió o el enlace ya no está vigente.")
    gestion = await db.get(GestionLegajoORM, legajo.id)
    if gestion is None:
        raise HTTPException(409, "No hay observaciones registradas.")
    return legajo, gestion


@enrutador.post("/seguimiento/recuperar-correccion")
async def recuperar_correccion(datos: TokenCorreccion, response: Response, db: AsyncSession = Depends(get_db)):
    legajo, gestion = await obtener_inscripcion_correccion(db, datos.token)
    response.headers["Cache-Control"] = "no-store"
    return {"numero_seguimiento": legajo.numero_seguimiento, "carrera_elegida": legajo.carrera_elegida,
        "observaciones": gestion.observaciones, "documentacion_a_corregir": gestion.documentacion_a_corregir or [],
        "datos": {campo: getattr(legajo, campo) or "" for campo in CAMPOS_CORRECCION}}


@enrutador.put("/seguimiento/reenviar-correccion", response_model=EstadoInscripcionRespuesta)
async def reenviar_correccion(token: str = Form(..., max_length=4096), datos: str = Form(...),
                             tipos: list[str] = Form([]), archivos: list[UploadFile] = File([]),
                             db: AsyncSession = Depends(get_db)):
    legajo, gestion = await obtener_inscripcion_correccion(db, token, bloquear=True)
    try:
        cambios = json.loads(datos)
        if not isinstance(cambios, dict) or set(cambios) != set(CAMPOS_CORRECCION):
            raise ValueError()
        validado = LegajoCrear(**{**cambios, "cohorte_id": legajo.cohorte_id,
            "carrera_elegida": legajo.carrera_elegida, "dni_pasaporte": legajo.dni_pasaporte,
            "correo_electronico": legajo.correo_electronico, "solicitud_beca": legajo.solicitud_beca})
    except ValidationError as exc:
        raise HTTPException(422, detail=exc.errors(include_context=False, include_input=False)) from exc
    except (ValueError, TypeError):
        raise HTTPException(422, "Los datos de corrección no son válidos.")
    requeridos = set(gestion.documentacion_a_corregir or [])
    if len(tipos) != len(archivos) or len(set(tipos)) != len(tipos) or set(tipos) != requeridos or not requeridos <= TIPOS_CORRECCION:
        raise HTTPException(422, "Adjuntá únicamente todos los documentos observados.")
    contenidos = {tipo: await validar_pdf(archivo, tipo) for tipo, archivo in zip(tipos, archivos)}
    nuevos_paths = []
    try:
        for campo in CAMPOS_CORRECCION:
            valor = getattr(validado, campo)
            setattr(legajo, campo, valor if valor is not None else "")
        for tipo, contenido in contenidos.items():
            ruta, checksum = guardar_pdf(contenido, legajo.id, tipo)
            nuevos_paths.append(ruta)
            # Conserva los documentos anteriores y sus referencias de auditoría.
            db.add(DocumentoLegajoORM(legajo_id=legajo.id, tipo=tipo, path=ruta, checksum=checksum))
        gestion.datos_verificados = False
        gestion.documentacion_a_corregir = []
        gestion.observaciones = None
        legajo.estado = "PENDIENTE"
        servicio_conduccion.registrar_auditoria(db, legajo_id=legajo.id, accion="REENVIAR_INSCRIPCION",
            anterior={"estado": "OBSERVADO"}, nuevo={"estado": "PENDIENTE"})
        await alertar_rol(db, "COORDINADOR", "Inscripción corregida",
            f"Inscripción {legajo.numero_seguimiento} reenviada para revisión.", f"/dashboard/conduccion/legajos/{legajo.id}")
        servicio_conduccion.encolar_correo(db, destinatario=legajo.correo_electronico,
            asunto="Inscripción reenviada", contenido=f"Recibimos tus correcciones. Tu número de seguimiento sigue siendo {legajo.numero_seguimiento}.")
        await db.commit()
    except Exception:
        await db.rollback()
        for ruta in nuevos_paths:
            Path(ruta).unlink(missing_ok=True)
        raise
    return EstadoInscripcionRespuesta(numero_seguimiento=legajo.numero_seguimiento, estado=legajo.estado)


# Las rutas estáticas deben preceder a la ruta dinámica de legajos.
enrutador.include_router(router_tesis)
enrutador.include_router(router_trabajos_practicos)
enrutador.include_router(router_alertas)

@enrutador.get(
    "/{legajo_id}",
    response_model=LegajoRespuesta,
)
async def obtener_detalle_legajo(
    legajo_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(coordinador_actual),
):
    repositorio = LegajoRepositorioPostgres(db)
    legajo = await repositorio.obtener_por_id(legajo_id)

    if legajo is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró el legajo.",
        )

    return legajo


@enrutador.get(
    "/{legajo_id}/documentos",
    response_model=DocumentacionLegajoRespuesta,
)
async def obtener_documentacion_legajo(
    legajo_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(coordinador_actual),
):
    repositorio = LegajoRepositorioPostgres(db)

    documentacion = await consultar_documentacion_legajo(
        repositorio=repositorio,
        legajo_id=legajo_id,
    )

    if documentacion is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró el legajo.",
        )

    return documentacion


@enrutador.patch(
    "/{legajo_id}/iniciar-revision",
    response_model=LegajoRespuesta,
)
async def iniciar_revision_legajo(
    legajo_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(coordinador_actual),
):
    await servicio_conduccion.ejecutar_transaccion(
        db,
        lambda: servicio_conduccion.aplicar_accion(
            db,
            legajo_id,
            AccionLegajoPeticion(
                accion=AccionLegajo.REVISAR,
                estado_esperado="PENDIENTE",
            ),
            usuario,
        ),
    )

    return await db.get(LegajoORM, legajo_id)
