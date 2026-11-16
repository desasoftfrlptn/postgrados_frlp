# ADR-008: Limitacion de solicitudes

- **Estado:** Propuesto; requiere aprobacion del equipo
- **Fecha:** 2026-11-16
- **Autor:** Equipo de desarrollo (por completar)
- **Revisores:** Pendiente

## Contexto

El formulario publico de inscripcion puede recibir trafico automatizado. El
SRS establece un maximo de 10 envios por direccion IP por hora. La
implementacion incluye una dependencia reutilizable de ventana fija, un
contador persistido en la base de datos y una respuesta HTTP 429; la
dependencia aun debe conectarse a las rutas correspondientes.

## Opciones evaluadas

### Opcion A: Ventana fija en PostgreSQL

- **Ventajas:** estado compartido por procesos y sin un servicio adicional; la
  operacion atomica evita incrementos perdidos.
- **Desventajas:** cada solicitud agrega una escritura y el limite puede
  reiniciarse en el borde entre ventanas.

### Opcion B: Contador en memoria del proceso

- **Ventajas:** no agrega escrituras a la base.
- **Desventajas:** cada proceso mantiene un contador distinto y se pierde al
  reiniciar.

### Opcion C: Servicio distribuido dedicado

- **Ventajas:** escala el conteo sin cargar la base relacional.
- **Desventajas:** agrega infraestructura y operacion para el volumen previsto
  del MVP.

## Decision propuesta

Proponemos usar el contador compartido en PostgreSQL con ventana fija para el
MVP. Para `POST /api/v1/inscripciones`, el limite objetivo es **10 solicitudes
por IP en una hora**, de acuerdo con NFR-S06. La dependencia debe responder con
HTTP 429 y `Retry-After` cuando se exceda el limite.

La clave persistida se guarda como hash y debe incluir el alcance de la ruta.
La limpieza de ventanas vencidas debe ejecutarse mediante una tarea operativa
definida; el repositorio incluye la funcion de limpieza pero no programa su
ejecucion automaticamente.

## Consecuencias

### Positivas

- El estado de limite se comparte entre instancias que usan la misma base.
- El MVP evita incorporar Redis u otro servicio dedicado.
- El limite puede variar por alcance sin duplicar la implementacion.

### Negativas y trade-offs

- Las solicitudes limitadas siguen generando actividad en la base.
- La ventana fija permite rafagas alrededor del cambio de hora de ventana.
- La IP observada puede ser la del proxy si la aplicacion esta detras de uno.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| Limite no aplicado a la ruta publica | Conectar explicitamente la dependencia y probar el umbral y la respuesta 429 |
| IP de origen incorrecta tras un proxy | Confiar cabeceras de proxy solo desde proxies configurados y de confianza |
| Acumulacion de contadores vencidos | Programar y monitorear la limpieza |
| Cambio de ventana permite trafico en rafaga | Evaluar ventana deslizante si el riesgo o volumen lo requieren |

## Pendientes de implementacion

Aplicar el limite de 10 por hora al endpoint publico y verificar como se obtiene
la IP real en cada entorno. La existencia del helper no implica que la ruta ya
este protegida por este control.

## Revision

Revisar ante aumento de trafico, despliegue con multiples proxies o
incorporacion de un servicio de conteo distribuido.
