# Registro provisional de modificaciones

PATCH registra eventos en el logger `seguimiento_graduacion.auditoria` con nivel
INFO. Incluye fecha UTC, identificador del usuario autenticado, identificador del
trabajo, operación, resultado y nombres de campos autorizados enviados.
No incluye valores de esos campos, emails, contraseñas ni tokens.

La aplicación debe configurar el nivel INFO y un formato o recolector que conserve
los atributos `extra`. Este módulo no modifica la configuración global de logging.

Los rechazos por rol se registran cuando la solicitud autenticada y válida alcanza
el caso de uso. Los errores de autenticación y de validación previos no se registran
desde este logger. Un cuerpo vacío conserva el trabajo sin ejecutar escrituras.

Este mecanismo no garantiza almacenamiento durable, recuperación de valores
anteriores ni auditoría completa de intentos rechazados. El historial persistente
de modificaciones y la política de datos, acceso y retención quedan pendientes
de coordinación con el equipo (Backlog US-C-001 y ASR-007).
