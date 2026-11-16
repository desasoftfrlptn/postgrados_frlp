# ADR-004: Almacenamiento privado de documentos

- **Estado:** Propuesto; requiere aprobacion del equipo
- **Fecha:** 2026-11-16
- **Autor:** Equipo de desarrollo (por completar)
- **Revisores:** Pendiente

## Contexto

Los documentos de inscripcion contienen datos personales y deben permanecer
fuera del webroot. El SRS requiere identificadores no predecibles, validacion
de PDF, checksum y acceso controlado. La implementacion actual escribe los
archivos en el directorio configurado por `STORAGE_PATH`, conserva un volumen
Docker y guarda en PostgreSQL una ruta relativa y el checksum SHA-256.

## Opciones evaluadas

### Opcion A: Sistema de archivos privado

- **Ventajas:** simple para el volumen esperado del MVP y no almacena los
  documentos binarios en la base relacional.
- **Desventajas:** requiere respaldar el volumen y coordinar la persistencia de
  archivos con las transacciones de la base de datos.

### Opcion B: Binarios dentro de PostgreSQL

- **Ventajas:** metadatos y archivos comparten transacciones y politicas de
  respaldo.
- **Desventajas:** aumenta el tamano y el costo operacional de la base.

### Opcion C: Almacenamiento de objetos

- **Ventajas:** escala de forma independiente y ofrece politicas de ciclo de
  vida.
- **Desventajas:** requiere un servicio y credenciales adicionales, fuera de
  las necesidades actuales del volumen del MVP.

## Decision propuesta

Proponemos usar el **sistema de archivos privado configurado por
`STORAGE_PATH`** para el MVP, con los metadatos en PostgreSQL. El nombre fisico
se genera como UUID; la base conserva una ruta relativa y el checksum SHA-256.
El directorio no debe exponerse como contenido estatico ni quedar dentro del
webroot. Docker Compose monta un volumen dedicado para persistirlo.

El upload actual valida el MIME declarado, la firma PDF y el maximo configurado
(5 MB por defecto). Antes de habilitar la consulta o descarga de documentos,
debe existir un endpoint que autentique al solicitante y verifique permisos
sobre el legajo. No debe publicarse una URL directa al archivo.

## Consecuencias

### Positivas

- Los binarios quedan separados de las tablas relacionales.
- Los nombres originales no se usan como nombres de archivo.
- El checksum permite detectar cambios no esperados en el contenido.

### Negativas y trade-offs

- El respaldo y la restauracion deben cubrir tanto PostgreSQL como el volumen
  de archivos.
- El guardado del archivo y el commit de la base no forman una unica
  transaccion; el codigo debe limpiar archivos ante fallas.
- La implementacion actual mantiene el contenido del upload en memoria hasta
  5 MB; debe reevaluarse si cambia el limite o la carga concurrente.

## Pendientes y mitigaciones

| Riesgo o pendiente | Mitigacion |
|---|---|
| Descarga o vista previa sin autorizacion | No habilitar el acceso hasta implementar verificacion de identidad, rol y propiedad |
| Perdida o desincronizacion de archivos | Definir respaldos del volumen y monitorear archivos huerfanos |
| Requisito de retencion de cinco anos | Definir politica de respaldo, retencion y eliminacion antes de operar con datos reales |

## Revision

Revisar si el volumen, la disponibilidad o los requisitos de retencion hacen
conveniente migrar a almacenamiento de objetos.
