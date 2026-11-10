## 11. Unir el frontend con el backend

Para que el frontend (React + Vite) pueda comunicarse con el backend (FastAPI) en desarrollo, necesitamos dos cosas: que el frontend sepa a qué URL pegarle, y que el backend permita esas peticiones vía CORS.

### Paso 1: Definir la URL del backend en el frontend

En `src/frontend/.env` (y agregarla también a `.env.example`):

```bash
# .env
VITE_API_URL=http://127.0.0.1:8000
```

> En Vite, las variables de entorno deben empezar con `VITE_` para estar disponibles en el código del navegador.

### Paso 2: Crear un cliente HTTP centralizado

Ubicación sugerida: `src/frontend/src/shared/api/client.ts`

```typescript
const API_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
```

Todos los módulos (`home`, `dashboard`, `inscripcion`) deben usar este cliente en vez de repetir `fetch` con la URL hardcodeada en cada componente.

### Paso 3: Consumirlo desde un componente o hook

```typescript
import { apiFetch } from "@/shared/api/client";

async function checkHealth() {
  const data = await apiFetch("/health");
  console.log(data); // { status: "ok" }
}
```

### Paso 4: Confirmar la configuración de CORS en el backend

En `main.py` ya está definido:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

> ⚠️ **Ojo con el puerto:** Vite por defecto corre en `http://localhost:5173`, no en `3000`. Verificá en qué puerto arranca tu frontend (`npm run dev` te lo muestra) y agregalo a `allow_origins` si no coincide:
>
> ```python
> allow_origins=["http://localhost:3000", "http://localhost:5173"],
> ```

### Paso 5: Levantar ambos servidores

```bash
# Terminal 1 — backend
cd src/backend
uvicorn main:app --reload

# Terminal 2 — frontend
cd src/frontend
npm run dev
```

O con Docker, como ya está documentado en el punto 7:

```bash
docker-compose up -d
```

### Paso 6: Probar la conexión

Antes de meterte con endpoints más complejos (como los de `inscripcion`), probá desde cualquier componente que la llamada a `/health` funcione y devuelva `{"status": "ok"}`. Si falla, revisá primero la consola del navegador: un error de CORS ahí casi siempre es el puerto mal configurado en `allow_origins`.

### Errores comunes

| Error | Causa probable | Solución |
|---|---|---|
| `Failed to fetch` / `CORS policy` en consola | El puerto del frontend no está en `allow_origins` del backend | Agregar el puerto correcto en `main.py` y reiniciar el backend |
| `VITE_API_URL is undefined` | Falta el `.env` en `src/frontend` o el nombre de la variable no empieza con `VITE_` | Verificar `.env` y reiniciar `npm run dev` (Vite no recarga env vars en caliente) |
| La request llega pero da 404 | La ruta no coincide con el router del backend | Revisar el prefijo del `enrutador` en `rutas.py` y el path usado en `apiFetch` |
| Funciona en Postman/Swagger pero no desde el navegador | Es un problema de CORS, no del endpoint en sí | Repetir Paso 4 |
