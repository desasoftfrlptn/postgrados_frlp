## Inicializar el backend (FastAPI + PostgreSQL)

Antes de levantar el backend por primera vez, necesitás tener PostgreSQL corriendo y configurado. Esto es aparte de instalar las dependencias de Python (ver punto 9).

### Requisitos previos

- Python 3.12
- PostgreSQL corriendo (local o vía Docker)
- Dependencias instaladas:

```bash
cd src/backend
py -3.12 -m pip install -r requirements.txt
py -3.12 -m pip install python-dotenv
```

### Paso 1: Crear la base de datos (solo la primera vez)

Conectate como administrador de Postgres:

```bash
psql -h 127.0.0.1 -U postgres
```

Y ejecutá:

```sql
CREATE USER postgrado_user WITH PASSWORD 'postgrado_dev_password';
CREATE DATABASE postgrado_dev OWNER postgrado_user;
```

### Paso 2: Configurar el `.env`

Copiá `.env.example` a `.env` si todavía no lo hiciste, y completá `DATABASE_URL` sin comillas y sin espacios alrededor del `=`:

```bash
# .env
DATABASE_URL=postgresql+asyncpg://postgrado_user:postgrado_dev_password@127.0.0.1:5432/postgrado_dev
```

> Recordá: el `.env` nunca se commitea (ver punto 10).

### Paso 3: Levantar el servidor

```bash
cd src/backend
uvicorn main:app --reload
```

Si arrancó bien vas a ver:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

Verificá en el navegador:

| URL | Qué deberías ver |
|---|---|
| `http://127.0.0.1:8000/` | Mensaje de bienvenida |
| `http://127.0.0.1:8000/health` | `{"status": "ok"}` |
| `http://127.0.0.1:8000/docs` | Interfaz Swagger de FastAPI |

---

## Caso de solución de problemas — Backend

### Error: `ConnectionResetError` / `asyncpg.exceptions.ConnectionDoesNotExistError` al iniciar

Significa que el backend no logra conectarse a Postgres. Revisá en este orden:

1. **¿Postgres está corriendo?**
   ```bash
   pg_isready -h 127.0.0.1 -p 5432
   ```
   Si no responde, iniciá el servicio o el contenedor de Docker.

2. **¿Existen el usuario y la base?**
   ```bash
   psql -h 127.0.0.1 -U postgrado_user -d postgrado_dev
   ```
   Si falla, volvé al Paso 1 de la sección 9.1.

3. **¿Se está cargando el `.env`?**
   `main.py` debe tener, antes que cualquier otro import del proyecto:
   ```python
   from dotenv import load_dotenv
   load_dotenv()
   ```
   Si falta, el `.env` se ignora por completo.

4. **¿El `.env` tiene el formato correcto?**
   Sin comillas, sin espacios:
   ```
   DATABASE_URL=postgresql+asyncpg://usuario:password@127.0.0.1:5432/nombre_base
   ```

5. **Probar la conexión aislada** (descarta que sea un tema de la app):
   ```python
   import asyncio
   from src.compartido.baseDeDatos.conexion import engine

   async def main():
       async with engine.connect() as conn:
           print("Conexión exitosa")

   asyncio.run(main())
   ```

6. **Firewall / antivirus (Windows):** algunos resetean conexiones locales a puertos no habituales. Si nada de lo anterior funcionó, probá desactivarlo temporalmente.

### Otros errores comunes

| Error | Causa probable | Solución |
|---|---|---|
| `ModuleNotFoundError` | Falta instalar una dependencia | `py -3.12 -m pip install -r requirements.txt` |
| `password authentication failed` | Usuario o contraseña incorrectos en `.env` | Verificar contra lo creado en Postgres |
| `database "..." does not exist` | No se creó la base | Repetir Paso 1 de la sección 9.1 |
| El `.env` no tiene efecto al cambiarlo | Falta `load_dotenv()` en `main.py` | Ver punto 3 de esta sección |


