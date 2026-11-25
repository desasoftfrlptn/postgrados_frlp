# Changelog — Sistema de  Posgrado

Todos los cambios notables de este proyecto se documentan en este archivo.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).  
Este proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

---

## [Unreleased]

> Los cambios que están en `develop` pero no en un release van acá.

### Added
- Panel con configuración de ítems según el usuario
- Dashboard del coordinador con:
    - Alertas 
    - Lista de inscripciones
    - Legajo digital de inscripto con workflow de estados
- Login
- Welcome screen para aspirantes/estudiantes
- Formulario de inscripción por pasos con wizard
- Mock inicial de datos con msw
- Tipado compartido para asegurar consistencia en todos los módulos
- Cliente de la api con el contrato definido
- Componentes compartidos: Button, NotificationsButton, Sidebar, Spinner, ThemeToggle y VentanaEmergente
- Contexto para el tema oscuro/claro
- Página 404 NotFound
- Estilos configurados con Tailwind en index.css
- Componente TestLegajos para testear las llamadas a la api (utilizando mocking) 
- Rutas iniciales con react-router-dom en App.tsx
- example.env para habilitar/deshabilitar el mocking

### Added
- Estructura inicial del repositorio
- Documentación base: SRS, PRD, BFD, Arquitectura, Cronograma

---

## [v0.1.0-alpha] — Sprint 0 (esperado 15/05/2026)

### Added
- Autenticación JWT básica (login/logout)
- Modelo de base de datos inicial con migraciones
- Docker Compose funcional para ambiente de desarrollo
- Pipeline de CI/CD base en GitHub Actions (lint + test + build)

---

## Historial de versiones planificadas

| Versión | Fecha planificada | Descripción |
|---------|:-----------------:|------------|
| v0.1.0-alpha | 15/05/2026 | Auth + DB + Docker |
| v0.5.0-beta | 31/07/2026 | Core completo |
| v0.8.0-rc | 11/09/2026 | Core + Módulo especializado |
| v1.0.0 | 23/10/2026 | Sistema completo + docs |
