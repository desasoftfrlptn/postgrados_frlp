# Changelog — Sistema de  Posgrado

Todos los cambios notables de este proyecto se documentan en este archivo.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).  
Este proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

---

## [Unreleased]

> Cambios implementados que todavía no forman parte de un release publicado.

### Added
- Estructura inicial del repositorio
- Documentación base: SRS, PRD, BFD, Arquitectura, Cronograma
- Dependencias para recibir formularios multipart y validar direcciones de email en el backend
- Modelos y migración inicial para cohortes, legajos y metadatos de documentos de inscripción
- Endpoint público de inscripción con validación de datos, unicidad por cohorte y almacenamiento privado de PDFs
- Formulario web conectado al endpoint de inscripción, con selección de beca, errores del servidor y código de seguimiento
- Punto de entrada FastAPI ubicado en `backend/main.py`, de acuerdo con la arquitectura del backend
- Reglas de Git para excluir archivos de bytecode de Python del repositorio
- Reglas de exclusión centralizadas en el `.gitignore` raíz y agrupadas por capa
- Autenticación con bcrypt, JWT de acceso y refresh, rotación y revocación de sesiones, y control de acceso por rol
- Persistencia y validaciones de solicitud de beca (30% o 100%) durante la inscripción
- Almacenamiento privado de documentos PDF con nombre UUID y checksum SHA-256, y descarga protegida para coordinación
- Validación de documentos obligatorios en el endpoint de inscripción
- Servicios compartidos para auditoría, autorización, correo, límites de solicitudes y encabezados de seguridad
- Workflow backend de legajos con transiciones controladas, auditoría, aviso de observación y token de corrección de un solo uso
- Generación de número de legajo al aprobar, con el formato definido por RF-CORE-003

### Changed
- Actualizado el seguimiento por módulo para distinguir funcionalidades conectadas al backend de prototipos con datos simulados
- Aclarado que el cronograma y las versiones listadas son planificados y no releases publicados

---

## Hitos de versión planificados (no publicados)

| Versión | Fecha planificada | Descripción |
|---------|:-----------------:|------------|
| v0.1.0-alpha | 15/05/2026 | Auth + DB + Docker |
| v0.5.0-beta | 31/07/2026 | Core completo |
| v0.8.0-rc | 11/09/2026 | Core + Módulo especializado |
| v1.0.0 | 23/10/2026 | Sistema completo + docs |

> Estas fechas son objetivos del plan, no fechas de publicación. Al 16/11/2026 el
> repositorio no tiene tags de versiones; las versiones no deben interpretarse
> como releases existentes.
