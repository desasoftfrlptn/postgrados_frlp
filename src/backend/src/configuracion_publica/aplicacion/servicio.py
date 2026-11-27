import re
from urllib.parse import urlsplit

from fastapi import HTTPException
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.configuracion_publica.infraestructura.orm_modelos import (
    ConfiguracionPublicaORM,
)


CONFIGURACION_INICIAL = {
    "home": {
        "hero_titulo": "Bienvenido al Sistema de Posgrado UTN FRLP",
        "hero_descripcion": (
            "Gestioná tu inscripción, consultá tu estado académico "
            "y accedé a toda la información de tu carrera."
        ),
        "boton_inscripcion": "Inscribite ahora",
        "boton_informacion": "Solicitar información",
        "boton_estado_inscripcion": "Consultar estado de inscripción",
        "tarjeta_carreras_titulo": "Carreras de Posgrado",
        "tarjeta_carreras_descripcion": (
            "Conocé nuestra oferta académica de especializaciones, "
            "maestrías y doctorados."
        ),
        "tarjeta_carreras_enlace": "Ver carreras",
        "tarjeta_calendario_titulo": "Calendario Académico",
        "tarjeta_calendario_descripcion": (
            "Consultá el calendario de clases, exámenes, "
            "inscripciones y fechas importantes."
        ),
        "tarjeta_calendario_enlace": "Ver calendario",
        "tarjeta_noticias_titulo": "Novedades",
        "tarjeta_noticias_descripcion": (
            "Enterate de las últimas noticias y comunicados "
            "de la facultad."
        ),
        "tarjeta_noticias_enlace": "Ver novedades",
        "tarjeta_faq_titulo": "¿Tenés dudas?",
        "tarjeta_faq_descripcion": (
            "Respondemos las preguntas más frecuentes sobre el posgrado."
        ),
        "tarjeta_faq_enlace": "Ir a preguntas frecuentes",
    },

    "carreras": {
        "titulo": "Carreras de Posgrado",
        "descripcion": (
            "Conocé nuestra oferta académica de especializaciones, "
            "maestrías y doctorados."
        ),
        "inscripcion_titulo": "¿Querés inscribirte?",
        "inscripcion_descripcion": (
            "Completá el formulario de inscripción online "
            "y adjuntá la documentación requerida."
        ),
        "inscripcion_boton": "Inscribite ahora",
    },

    "contacto": {
        "titulo": "Contacto",
        "descripcion": (
            "Estamos para ayudarte. Contactanos para resolver tus dudas "
            "sobre nuestras carreras y el proceso de inscripción."
        ),
        "formulario_titulo": "Envianos tu consulta",
        "formulario_descripcion": (
            "Completá el formulario y nuestro equipo se pondrá "
            "en contacto a la brevedad."
        ),
        "direccion": "Calle 60 y 124 s/n, La Plata, Buenos Aires",
        "email": "posgrado@frlp.utn.edu.ar",
        "telefono": "+54 9 4277270",
        "horario": "Lunes a viernes de 9 a 18 hs",
        "facebook": "",
        "instagram": "",
        "linkedin": "",
        "youtube": "",
    },

    "calendario": {
        "titulo": "Calendario Académico",
        "descripcion": "Consultá las fechas importantes del ciclo lectivo",
        "anio_minimo": "2025",
        "anio_maximo": "2027",
    },
}


REDES_SOCIALES = {
    "facebook",
    "instagram",
    "linkedin",
    "youtube",
}

VALIDADOR_EMAIL = TypeAdapter(EmailStr)


def validar_valor_contacto(clave: str, valor: str) -> None:
    """Valida los datos de la configuración de contacto."""

    if clave in REDES_SOCIALES:
        # Las redes sociales son opcionales.
        if not valor:
            return

        try:
            url = urlsplit(valor)

            enlace_valido = (
                url.scheme in {"http", "https"}
                and bool(url.hostname)
                and url.username is None
                and url.password is None
                and "\\" not in valor
                and not any(
                    caracter.isspace() or ord(caracter) < 32
                    for caracter in valor
                )
            )

            # Comprueba que el puerto sea válido, si fue indicado.
            _ = url.port

        except ValueError:
            enlace_valido = False

        if not enlace_valido or len(valor) > 500:
            raise HTTPException(
                status_code=400,
                detail=f"El enlace de '{clave}' no es válido.",
            )

        return

    if clave == "email":
        try:
            VALIDADOR_EMAIL.validate_python(valor)

        except ValidationError as exc:
            raise HTTPException(
                status_code=400,
                detail="El correo electrónico no es válido.",
            ) from exc

        return

    if clave == "telefono":
        digitos = re.sub(r"\D", "", valor)

        if (
            not re.fullmatch(r"\+?[0-9 ()-]+", valor)
            or not 7 <= len(digitos) <= 15
        ):
            raise HTTPException(
                status_code=400,
                detail="El teléfono no es válido.",
            )

        return

    if len(valor) > 1000:
        raise HTTPException(
            status_code=400,
            detail=f"El campo '{clave}' es demasiado largo.",
        )


def validar_seccion(
    seccion: str,
) -> dict[str, str]:
    configuracion = CONFIGURACION_INICIAL.get(seccion)

    if configuracion is None:
        raise HTTPException(
            status_code=404,
            detail="Sección de configuración no encontrada",
        )

    return configuracion


async def asegurar_configuracion(
    seccion: str,
    db: AsyncSession,
) -> None:
    valores_iniciales = validar_seccion(seccion)

    consulta = select(
        ConfiguracionPublicaORM
    ).where(
        ConfiguracionPublicaORM.seccion == seccion
    )

    resultado = await db.execute(consulta)

    registros = list(
        resultado.scalars().all()
    )

    claves_existentes = {
        registro.clave
        for registro in registros
    }

    hubo_cambios = False

    for clave, valor in valores_iniciales.items():
        if clave not in claves_existentes:
            db.add(
                ConfiguracionPublicaORM(
                    seccion=seccion,
                    clave=clave,
                    valor=valor,
                )
            )

            hubo_cambios = True

    if hubo_cambios:
        try:
            await db.commit()

        except Exception:
            await db.rollback()
            raise


async def obtener_configuracion(
    seccion: str,
    db: AsyncSession,
) -> dict[str, str]:
    await asegurar_configuracion(seccion, db)

    consulta = select(
        ConfiguracionPublicaORM
    ).where(
        ConfiguracionPublicaORM.seccion == seccion
    )

    resultado = await db.execute(consulta)

    registros = resultado.scalars().all()

    return {
        registro.clave: registro.valor
        for registro in registros
    }


async def modificar_configuracion(
    seccion: str,
    valores: dict[str, str],
    db: AsyncSession,
) -> dict[str, str]:
    valores_permitidos = validar_seccion(seccion)

    claves_invalidas = [
        clave
        for clave in valores
        if clave not in valores_permitidos
    ]

    if claves_invalidas:
        raise HTTPException(
            status_code=400,
            detail=(
                "Se enviaron parámetros "
                "no permitidos para esta sección"
            ),
        )

    valores_limpios: dict[str, str] = {}

    # Valida todos los campos antes de modificar la base de datos.
    for clave, valor in valores.items():
        valor_limpio = valor.strip()

        es_opcional = (
            seccion == "contacto"
            and clave in REDES_SOCIALES
        )

        if not valor_limpio and not es_opcional:
            raise HTTPException(
                status_code=400,
                detail=f"El valor de '{clave}' no puede estar vacío",
            )

        if seccion == "contacto":
            validar_valor_contacto(clave, valor_limpio)

        valores_limpios[clave] = valor_limpio

    await asegurar_configuracion(seccion, db)

    consulta = select(
        ConfiguracionPublicaORM
    ).where(
        ConfiguracionPublicaORM.seccion == seccion
    )

    resultado = await db.execute(consulta)

    registros_por_clave = {
        registro.clave: registro
        for registro in resultado.scalars().all()
    }

    try:
        hubo_cambios = False

        for clave, valor in valores_limpios.items():
            registro = registros_por_clave[clave]

            if registro.valor != valor:
                registro.valor = valor
                hubo_cambios = True

        if hubo_cambios:
            await db.commit()

    except Exception:
        await db.rollback()
        raise

    return await obtener_configuracion(seccion, db)


async def restablecer_configuracion(
    seccion: str,
    db: AsyncSession,
) -> dict[str, str]:
    valores_originales = validar_seccion(seccion)

    return await modificar_configuracion(
        seccion,
        valores_originales.copy(),
        db,
    )