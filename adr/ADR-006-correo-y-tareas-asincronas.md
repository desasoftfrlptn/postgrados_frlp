# ADR-006: Envio de correo y trabajo en segundo plano

- **Estado:** Propuesto; requiere aprobacion del equipo
- **Fecha:** 2026-11-16
- **Autor:** Equipo de desarrollo (por completar)
- **Revisores:** Pendiente

## Contexto

El sistema envia confirmaciones y debera enviar notificaciones por cambios de
estado y tareas programadas. El backend ya cuenta con un cliente SMTP
configurable, MailHog para desarrollo y usa `BackgroundTasks` de FastAPI para
la confirmacion de inscripcion. La llamada de fondo no constituye una cola
durable ni ofrece reintentos persistentes.

## Opciones evaluadas

### Opcion A: SMTP configurable y tareas en segundo plano del proceso web

- **Ventajas:** simple para el volumen actual y no agrega infraestructura.
- **Desventajas:** una interrupcion del proceso puede perder trabajos pendientes;
  no hay reintentos durables ni cola observable.

### Opcion B: SMTP sincrono dentro de la solicitud

- **Ventajas:** el resultado del envio puede conocerse antes de responder.
- **Desventajas:** aumenta la latencia y acopla la disponibilidad de la
  inscripcion a la del servidor de correo.

### Opcion C: Cola durable y trabajador independiente

- **Ventajas:** permite reintentos, persistencia y procesamiento desacoplado.
- **Desventajas:** requiere infraestructura y operacion adicionales.

## Decision propuesta

Proponemos encapsular los envios en el cliente SMTP compartido, configurado
mediante variables de entorno y con TLS opcional segun el servidor. Para
desarrollo, MailHog recibe el correo sin enviarlo a destinatarios reales. Las
notificaciones de baja criticidad pueden iniciarse mediante tareas en segundo
plano del backend para el MVP.

No consideramos que `BackgroundTasks` sea una cola durable. Los envios criticos
o que requieran reintentos garantizados deberan migrar a una cola persistente
antes de depender de ellos para procesos administrativos. Las tareas
programadas de negocio tambien requieren elegir e implementar un mecanismo
antes de activarlas.

## Consecuencias

### Positivas

- Los modulos comparten configuracion y transporte SMTP.
- Las pruebas pueden sustituir el transporte sin comunicarse con un servidor
  externo.
- MailHog permite revisar mensajes en desarrollo.

### Negativas y trade-offs

- Un fallo de SMTP puede impedir la entrega y `BackgroundTasks` no garantiza
  reintentos despues de reiniciar el proceso.
- No existe todavia una politica de reintentos, deduplicacion o estado de
  entrega.
- Las tareas periodicas descritas por la arquitectura no quedan implementadas
  por esta decision.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| SMTP no disponible | Registrar el fallo y definir una cola durable si el envio es requisito critico |
| Credenciales expuestas | Usar variables de entorno protegidas y no registrar contrasenas |
| Reenvio duplicado | Definir claves de idempotencia al incorporar reintentos |

## Revision

Revisar cuando se implemente una notificacion que no pueda perderse o se
incorporen jobs recurrentes.
