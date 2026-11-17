# Cohortes y documentos

Rutas bajo `/api/v1`:

- `GET /cohortes/{id}`: detalle publico, con el mismo schema del listado. 404 si no existe.
- `GET /estadisticas/cohortes?tipo_carrera=Maestria`: requiere coordinador. Ultimas tres cohortes, ordenadas por anio y fecha de creacion descendentes. El filtro admite Especializacion, Maestria y Doctorado; conserva cohortes sin coincidencias con contadores en cero. `total_inscriptos` excluye BORRADOR; activos, graduados y bajas cuentan los estados respectivos. `en_riesgo` cuenta semaforos ROJO almacenados, igual que el listado de graduacion.
- `GET /legajos/{legajo_id}/documentos`: coordinador, estudiante vinculado al legajo o cookie de enlace SEGUIMIENTO del mismo legajo. Los enlaces INSCRIPCION no dan acceso al listado. Devuelve la ultima version por tipo, sin rutas internas ni checksum.
- `PATCH /legajos/{legajo_id}/documentos/{documento_id}`: solo coordinador. Acciones APROBAR, OBSERVAR y MARCAR_FALTANTE. Las dos ultimas exigen motivo no vacio, hasta 2000 caracteres. Aprobar elimina el motivo anterior. Un documento de otro legajo devuelve 404; una version reemplazada devuelve 409.

La revision cambia solamente el documento y registra una auditoria con usuario, accion y motivo, en la misma transaccion. No cambia el estado academico del legajo. Marcar faltante conserva la fila y el PDF. Una nueva carga crea otra version en PENDIENTE_REVISION, que sustituye a la anterior en el listado. Los archivos anteriores siguen sujetos a los mismos permisos de descarga.

Aplicar `uv run alembic upgrade head` antes de iniciar el backend: la migracion d2b6c8f14a90 habilita el estado documental FALTANTE. No elimina documentos existentes.

Pruebas: `python -m pytest --import-mode=importlib`. Las pruebas HTTP de PostgreSQL requieren TEST_DATABASE_URL en una base exclusiva llamada fenix_postgrado_test; cada caso crea y limpia un esquema aislado. En frontend: `npm run test:api` y `npm run build`.
