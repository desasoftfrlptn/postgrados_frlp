# Guía de Contribución — postgrado Posgrado (Modificada)

Leé este documento antes de comenzar a rabajar en el proyecto. La idea es que los 4 podamos trabajar en paralelo sin pisarnos cambios ni romper main.
---

## 1. Tecnologias del proyecto

El proyecto está dividido en frontend y backend

Frontend: React, TypeScript, Vite, React Router y Tailwind CSS

Backend: Python 3.12, FastAPI, Uvicorn, SQLAlchemy, Alembic, PostgreSQL

Herramientas: Git, GitHub y Docker/Docker compose
---
## 2. Estructura general (por ahora)

La estructura principal es: 

postgrados_frlp/
│
├── src/
│   ├── backend/
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   ├── database/
│   │   └── src/
│   │
│   └── frontend/  --> Buscamos separar las funcionalidades por modulos
│       ├── src/
│       │   ├── assets/
│       │   ├── dashboard/
│       │   ├── home/
│       │   ├── inscripcion/
│       │   └── shared/  --> Shred es la unica que contiene elementos que son reutilizables en todo el proyecto
│       │
│       └── package.json
│
├── docs/
├── docker-compose.yml
├── .env
└── .env.example

---

## 3. Ramas de Git

Para evitar que varias personas trabajen directamente sobre main, cada integrante debe trabajar en su propia rama.

La rama MAIN es la principal y es la qu nos tenemos queasegurar que siempre funcione


Pasos para crear las ramas:

Primero asegurate de estar en main actualizado (Trarnos los ultimos cambios que alguien haya hecho): 

git checkout main
git pull origin main

Ahora si, crear tu rama:

git checkout -b rama-ursula

Luego, podemos ver en que rama estamos parados: En la rama que estamos parados aparece con un *

git branch 
---

## 4. Guardar cambios

Una vez terminado de modificar lo que queremos subir hacemos un para agregar todo lo modificado:

git add .

si no, tambien podemos subir de forma especifica:

git add src/home/pages/HomePage.tsx  -- Esta se una mas para los conflictos al momento de mergear, siempre recomiendo al primera.

Despues podemos hacer un:

git status

El cual nos sirve para corroborar que todos nuestros cambios se esten subiendo correctamente

## 5. Crear un Commit

Se suele utilizar una forma universal para que todos lo entendamos:

Formato: `tipo(alcance): descripción en presente, sin mayúscula inicial, sin punto final`

**Tipos válidos:**

| Tipo | Cuándo usarlo |
|------|--------------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Cambios en documentación |
| `test` | Agrega o modifica tests |
| `refactor` | Refactorización sin cambio de comportamiento |
| `chore` | Tareas de mantenimiento (CI, dependencias) |
| `style` | Formato (linting, espacios) sin cambio de lógica |

Ejemplos:
feat(home): agrega pagina principal
feat(navbar): agrega navegacion principal
fix(auth): corrige redireccion despues del login
refactor(inscripcion): reorganiza componentes
docs(readme): actualiza instrucciones de instalacion
chore(deps): actualiza dependencias
---

## 6.  Subir mi rama a GitHub

Despues del Commit usamos: (El -u es solo para la primera vez, despues ya no se pone)

git push -u origin rama-julian

---
## 7.  Pull Request

Una vez ya este todo subido a nuestra rama tenemos que saber que el push no lo hace directamente al main para no romper nada justamente.
Entonces el Pull Request permite que otro integrante revise los cambios antes de incorporarlos.

Antes de pasar al como se hace un PR verificamos que:
- El proyecto compila.
- No hay errores.
- La funcionalidad funciona.
- No se rompieron funcionalidades existentes.
- Los cambios están relacionados con lo que se quería implementar.

Despues si vas a la pagina de GitHub y solicitas un Pull Request de loq ue acabas de subir a tu rama con el main

### Qué incluir en el PR

**Título:** Igual que el título de la historia de usuario. Ej: `[US-CORE-001] Formulario de inscripción de aspirantes`

**Descripción (template):**
```markdown
## ¿Qué hace este PR?
[Descripción de qué implementa en 2-3 oraciones]

## Historia de usuario
Cierra #[número de issue en GitHub] — US-CORE-001

## Cambios principales
- [Lista de cambios relevantes]


## 8.  Mantener actualizada mi rama:

Como otras personas pueden mergear cambios a main, antes de seguir trabajando conviene actualizarse.

git checkout main
git pull origin main

Después volver a nuestra rama:

git checkout rama-matias

y traer esas actualizaciones que por ahora solo llegaron al main:

git merge main

---

--- Importante!!! ---
## 9. Instalaciones del proyecto:


Cada area va a tener ciertas dependencias por lo que cada una debe estar actualizada para que no nos falte ninguna. Como se hace:

Comprobamos la version: py -3.12 --version

Backend:
cd src/backend
py -3.12 -m pip install -r requirements.txt

Frontend:
cd src/frontend
npm install


## 10. Variables de Entorno

**NUNCA commitear el archivo `.env`**. Está en `.gitignore`.

Cuando agregues una variable nueva:
1. Agregala a `.env.example` con un valor de ejemplo (no real)
2. Documentala en el comentario del `.env.example`
3. Mencionala en la descripción del PR

```bash
# .env.example
DATABASE_URL=postgresql://user:password@localhost:5432/postgrado_dev
JWT_SECRET=cambiar-en-produccion-por-secreto-seguro-32chars-min
SMTP_HOST=smtp.example.com
SMTP_PORT=587
STORAGE_PATH=/var/postgrado-storage  # Ruta donde se almacenan los PDFs
```

---

## 7. Comandos Útiles

```bash
# Levantar ambiente completo
docker-compose up -d

# Ver logs del backend en tiempo real
docker-compose logs -f backend

# Correr tests
npm test                  # o: pytest
npm run test:coverage     # con reporte de cobertura

# Linting
npm run lint              # o: flake8 src/
npm run lint:fix          # corrige automáticamente

# Migraciones de base de datos
npm run db:migrate        # aplica migraciones pendientes
npm run db:generate       # genera nueva migración desde cambio en schema

# Acceder a la base de datos
docker exec -it postgrado-db psql -U postgrado_user -d postgrado_dev
```

---
