"""Datos ficticios para pruebas manuales, nunca para producción.
Ejecutar: python -m src.scripts.cargar_demo --confirmar
No envía correos ni modifica registros existentes.
"""
import argparse
import asyncio
import os
from datetime import date, datetime, timedelta, timezone
from secrets import token_urlsafe
from uuid import UUID, uuid5

from sqlalchemy import select, text, func
from sqlalchemy.dialects.postgresql import insert
from src.compartido.conexion import AsyncSessionLocal, engine
from src.usuarios.modelos import UsuarioORM, RolORM
from src.usuarios.seguridad import hash_password
from src.carreras.modelos import CarreraORM
from src.inscripcion.infraestructura.cohortes_modelos import CohorteORM
from src.inscripcion.infraestructura.orm_modelos import LegajoORM, ContadorInscripcionORM
from src.conduccion.modelos import GestionLegajoORM
from src.conduccion.servicio import asignar_legajo_personal
from src.seminarios.infraestructura.orm_modelos import SeminarioORM, InscripcionSeminarioORM, AsistenciaClaseORM

NAMESPACE = UUID('8fcd8410-8ed4-4e9b-83b9-a8c600352db2')


def uid(clave):
    return uuid5(NAMESPACE, clave)


async def obtener_o_crear(db, modelo, clave, **datos):
    existente = await db.get(modelo, uid(clave))
    if existente is not None:
        return existente, False
    objeto = modelo(id=uid(clave), **datos)
    db.add(objeto)
    await db.flush()
    return objeto, True


async def cargar():
    if os.getenv('ENVIRONMENT') != 'development':
        raise SystemExit('Carga permitida solo en ENVIRONMENT=development.')
    engine.echo = False
    hoy = date.today()
    ahora = datetime.now(timezone.utc)
    clave = token_urlsafe(15)
    accesos = []
    resumen = []
    try:
        async with AsyncSessionLocal() as db, db.begin():
            # Una sola carga simultánea. Toda la carga se confirma o revierte junta.
            await db.execute(text('SELECT pg_advisory_xact_lock(72519026)'))
            roles = {}
            for nombre in ('ALUMNO', 'DOCENTE', 'CPR', 'COORDINADOR', 'ADMIN'):
                rol = await db.scalar(select(RolORM).where(RolORM.nombre == nombre))
                if rol is None:
                    rol = RolORM(nombre=nombre)
                    db.add(rol)
                    await db.flush()
                roles[nombre] = rol.id

            async def cuenta(ident, nombre, apellido, dni, rol):
                correo = f'{ident}@demo.example.invalid'
                usuario, nuevo = await obtener_o_crear(db, UsuarioORM, 'usuario:'+ident,
                    nombre=nombre, apellido=apellido, dni=dni, correo_electronico=correo,
                    rol_id=roles[rol], activo=True, debe_cambiar_contrasena=False,
                    contrasena_hash=hash_password(clave))
                if nuevo:
                    accesos.append((rol, correo))
                return usuario

            for i, rol in enumerate(('ADMIN', 'COORDINADOR', 'CPR'), 1):
                await cuenta(rol.lower(), 'Prueba', rol, f'9900000{i}', rol)
            docentes = []
            for i in range(1, 7):
                docentes.append(await cuenta(f'docente{i:02}', f'Docente {i}', 'Demo', f'990001{i:02}', 'DOCENTE'))

            tipos = [('Maestria', 'Maestría en Sistemas de Información'),
                     ('Maestria', 'Maestría en Ciencia de Datos'),
                     ('Doctorado', 'Doctorado en Ingeniería'),
                     ('Doctorado', 'Doctorado en Tecnologías de Información'),
                     ('Especializacion', 'Especialización en Seguridad Informática'),
                     ('Especializacion', 'Especialización en Gestión Tecnológica')]
            for c, (tipo, nombre) in enumerate(tipos, 1):
                carrera, _ = await obtener_o_crear(db, CarreraORM, f'carrera:{c}',
                    nombre='[DEMO] '+nombre, tipo=tipo, duracion='2 años' if tipo != 'Doctorado' else '4 años',
                    descripcion='Carrera ficticia para pruebas locales.', activo=True)
                cohorte, _ = await obtener_o_crear(db, CohorteORM, f'cohorte:{c}',
                    nombre=f'DEMO-{c:02}-2026', anio=2026, abierta=True,
                    fecha_inicio=hoy-timedelta(days=60), carrera_id=carrera.id)
                seminarios = []
                for s, materia in enumerate(('Metodología de investigación', 'Análisis aplicado', 'Seminario integrador'), 1):
                    sem, _ = await obtener_o_crear(db, SeminarioORM, f'sem:{c}:{s}',
                        nombre=f'[DEMO {c:02}] {materia}', carrera_id=carrera.id,
                        docente_id=docentes[(c+s-2)%6].id, fecha_inicio=hoy-timedelta(days=30),
                        fecha_fin=hoy+timedelta(days=60), activo=True)
                    seminarios.append(sem)
                for a in range(1, 7):
                    ident = f'alumno{c:02}{a:02}'
                    dni = f'99{c:02}{a:04}'
                    correo = f'{ident}@demo.example.invalid'
                    estado = ('ACTIVO' if a != 4 else 'EN_RIESGO') if a <= 4 else ('PENDIENTE' if a == 5 else 'OBSERVADO')
                    legajo = await db.get(LegajoORM, uid('legajo:'+ident))
                    if legajo is None:
                        contador = insert(ContadorInscripcionORM).values(anio=hoy.year, ultimo_numero=1)
                        contador = contador.on_conflict_do_update(index_elements=['anio'], set_={'ultimo_numero': ContadorInscripcionORM.ultimo_numero+1}).returning(ContadorInscripcionORM.ultimo_numero)
                        numero = await db.scalar(contador)
                        legajo, _ = await obtener_o_crear(db, LegajoORM, 'legajo:'+ident,
                            numero_seguimiento=f'INS-{hoy.year}-{numero}', cohorte_id=cohorte.id,
                            carrera_elegida=carrera.nombre, apellido='Demo', nombre=f'Estudiante {c:02}-{a:02}',
                            nacionalidad='Argentina', dni_pasaporte=dni, telefono_movil=None,
                            correo_electronico=correo, correo_alternativo=f'alternativo.{correo}',
                            domicilio='Domicilio ficticio', estado=estado, pais='Argentina', provincia='Buenos Aires',
                            ciudad='La Plata', titulo_anterior='Ingeniería', universidad_anterior='UTN',
                            forma_conocio_ofertas='Sitio web', motivos_cursar='Prueba académica local', solicitud_beca=None)
                        matriculado = a <= 4
                        gestion = GestionLegajoORM(legajo_id=legajo.id, datos_verificados=matriculado,
                            fecha_aprobacion=ahora if matriculado else None, fecha_matricula=ahora if matriculado else None,
                            observaciones='Demo: documentación pendiente de revisión.' if a == 6 else None,
                            documentacion_a_corregir=[])
                        db.add(gestion)
                        if matriculado:
                            await asignar_legajo_personal(db, legajo, gestion)
                        await db.flush()
                    if a <= 4 and legajo.estado in ('ACTIVO', 'EN_RIESGO'):
                        await cuenta(ident, legajo.nombre, legajo.apellido, legajo.dni_pasaporte, 'ALUMNO')
                        for s, sem in enumerate(seminarios[:2], 1):
                            insc, nueva = await obtener_o_crear(db, InscripcionSeminarioORM, f'cursada:{c}:{a}:{s}',
                                legajo_id=legajo.id, seminario_id=sem.id, nota_final=None,
                                asistencias=2 if a != 4 else 1, total_clases=2, estado='CURSANDO')
                            if nueva:
                                for k in (1, 2):
                                    await obtener_o_crear(db, AsistenciaClaseORM, f'asistencia:{c}:{a}:{s}:{k}',
                                        legajo_id=legajo.id, seminario_id=sem.id,
                                        fecha=hoy-timedelta(days=7*k), presente=a != 4 or k == 1)
                    resumen.append((legajo.numero_seguimiento, legajo.estado, carrera.nombre))
        print('Carga confirmada. No se enviaron correos.')
        for seguimiento, estado, carrera in resumen:
            print(seguimiento, estado, carrera)
        if accesos:
            print('\nContraseña temporal de las NUEVAS cuentas demo:', clave)
            for rol, correo in accesos:
                print(rol, correo)
        else:
            print('No se crearon nuevas cuentas; se conservaron las contraseñas anteriores.')
    finally:
        await engine.dispose()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--confirmar', action='store_true')
    if not parser.parse_args().confirmar:
        parser.error('Usá --confirmar para cargar datos ficticios en desarrollo.')
    asyncio.run(cargar())
