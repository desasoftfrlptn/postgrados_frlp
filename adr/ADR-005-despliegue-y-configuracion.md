# ADR-005: Despliegue y configuracion de entornos

- **Estado:** Propuesto; requiere aprobacion del equipo
- **Fecha:** 2026-11-16
- **Autor:** Equipo de desarrollo (por completar)
- **Revisores:** Pendiente

## Contexto

El equipo necesita un entorno local reproducible con base de datos, backend,
frontend y un servidor SMTP de desarrollo. El repositorio incluye Docker
Compose, variables de entorno y volumenes persistentes. El compose actual
ejecuta Vite en modo desarrollo y no aplica migraciones automaticamente. La
estrategia de produccion aun no esta descrita como un despliegue separado.

## Opciones evaluadas

### Opcion A: Docker Compose para desarrollo

- **Ventajas:** levanta los servicios locales y sus dependencias con una
  configuracion compartida.
- **Desventajas:** no define por si solo TLS, proxy inverso, respaldo,
  observabilidad ni alta disponibilidad de produccion.

### Opcion B: Instalacion local manual de cada servicio

- **Ventajas:** menos abstraccion para depurar una tecnologia individual.
- **Desventajas:** mayor variacion entre equipos y mas pasos de configuracion.

### Opcion C: Usar el compose de desarrollo directamente en produccion

- **Ventajas:** reutiliza archivos existentes.
- **Desventajas:** el frontend usa servidor de desarrollo y faltan decisiones
  operativas necesarias para exponer el sistema con seguridad.

## Decision propuesta

Proponemos usar **Docker Compose como entorno de desarrollo local**, con
PostgreSQL, FastAPI, Vite, MailHog y volumenes dedicados para la base y los
documentos. La configuracion se proporciona mediante variables de entorno; los
secretos reales no se versionan.

Las migraciones se aplican explicitamente con `alembic upgrade head` antes de
usar una base nueva o actualizar un entorno. No se ejecutan implicitamente al
iniciar el backend.

El compose y las imagenes de desarrollo actuales **no quedan aprobados como
despliegue de produccion**. La topologia de produccion, TLS/proxy, respaldos,
ejecucion controlada de migraciones y estrategia de rollback requieren una
decision operativa separada antes de publicar datos reales.

## Consecuencias

### Positivas

- El entorno de desarrollo y la version de PostgreSQL quedan declarados.
- Los datos de PostgreSQL y los documentos sobreviven al reinicio de
  contenedores mediante volumenes.
- Los valores sensibles se pueden inyectar sin incorporarlos al codigo.

### Negativas y trade-offs

- Quien desarrolla debe aplicar las migraciones de forma explicita.
- Los volumenes locales no constituyen una politica de respaldo.
- Se necesita una configuracion adicional para produccion.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| Secretos de ejemplo usados en produccion | Reemplazarlos por valores fuertes y bloquear valores conocidos en configuracion de produccion |
| Backend arrancado con esquema desactualizado | Incluir `alembic upgrade head` en el procedimiento de despliegue y verificar el resultado |
| Exposicion de servicios internos | Definir puertos publicos, proxy, TLS y reglas de red antes de produccion |

## Revision

Revisar antes de la primera instalacion en un servidor de la facultad o de
exponer la aplicacion fuera del entorno local.
