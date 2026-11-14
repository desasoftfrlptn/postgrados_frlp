# Contiene la lógica para consultar y modificar el contenido público.

from fastapi import HTTPException
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
    },

    "calendario": {
        "titulo": "Calendario Académico",
        "descripcion": "Consultá las fechas importantes del ciclo lectivo",
        "anio_minimo": "2025",
        "anio_maximo": "2027",
    },
}


def validar_seccion(
    seccion: str,
) -> dict[str, str]:
    configuracion = CONFIGURACION_INICIAL.get(
        seccion
    )

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
    valores_iniciales = validar_seccion(
        seccion
    )

    consulta = select(
        ConfiguracionPublicaORM
    ).where(
        ConfiguracionPublicaORM.seccion
        == seccion
    )

    resultado = await db.execute(
        consulta
    )

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
        await db.commit()


async def obtener_configuracion(
    seccion: str,
    db: AsyncSession,
) -> dict[str, str]:
    await asegurar_configuracion(
        seccion,
        db,
    )

    consulta = select(
        ConfiguracionPublicaORM
    ).where(
        ConfiguracionPublicaORM.seccion
        == seccion
    )

    resultado = await db.execute(
        consulta
    )

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
    valores_permitidos = validar_seccion(
        seccion
    )

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

    await asegurar_configuracion(
        seccion,
        db,
    )

    consulta = select(
        ConfiguracionPublicaORM
    ).where(
        ConfiguracionPublicaORM.seccion
        == seccion
    )

    resultado = await db.execute(
        consulta
    )

    registros = resultado.scalars().all()

    registros_por_clave = {
        registro.clave: registro
        for registro in registros
    }

    for clave, valor in valores.items():
        valor_limpio = valor.strip()

        if not valor_limpio:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"El valor de '{clave}' "
                    "no puede estar vacío"
                ),
            )

        registros_por_clave[
            clave
        ].valor = valor_limpio

    await db.commit()

    return await obtener_configuracion(
        seccion,
        db,
    )