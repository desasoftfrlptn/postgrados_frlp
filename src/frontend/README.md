# Sistema de Posgrado UTN FRLP — Frontend

Aplicación web del Sistema de Posgrado de la Universidad Tecnológica Nacional, Facultad Regional La Plata.

## Tecnologías

- React 19
- TypeScript
- Vite 8
- React Router
- Tailwind CSS
- Vitest
- React Testing Library

## Requisitos

- Node.js compatible con las dependencias del proyecto.
- npm.
- Backend del Sistema de Posgrado disponible para las funciones que requieren API.

## Instalación

Desde la carpeta `src/frontend`:

```bash
npm ci
```

## Configuración del entorno

Crear un archivo `.env` tomando como referencia `.env.example`.

Variables utilizadas:

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de los endpoints del Backend |
| `VITE_API_BASE` | URL base para imágenes y documentos |
| `VITE_USE_POLLING` | Activa polling para el servidor de desarrollo cuando es necesario |

Las variables que comienzan con `VITE_` se incorporan al código del cliente. No incluir contraseñas, tokens ni secretos.

## Desarrollo

```bash
npm run dev
```

El servidor de desarrollo está configurado para utilizar el puerto `3000`.

## Compilación

```bash
npm run build
```

## Calidad del código

```bash
npm run lint
```

## Pruebas automatizadas

```bash
npm run test:run
```

Para ejecutar Vitest en modo interactivo:

```bash
npm run test
```

## Organización del código

- `src/shared/`: API, componentes y recursos compartidos.
- `src/modulos/home/`: página de inicio pública.
- `src/modulos/carreras/`: oferta académica pública.
- `src/modulos/noticias/`: noticias.
- `src/modulos/calendario/`: calendario académico.
- `src/modulos/contacto/`: contacto.
- `src/modulos/preguntas-frecuentes/`: preguntas frecuentes.
- `src/modulos/inscripcion/`: inscripción y seguimiento.
- `src/modulos/manejo-sesion/`: autenticación y gestión de sesión.
- `src/modulos/perfiles/`: módulos de Administración, Conducción, Docente y Estudiante.
- `tests/`: pruebas automatizadas.

## Componentes compartidos

Los componentes reutilizables deben ubicarse en `src/shared/` o, cuando correspondan exclusivamente a las vistas de perfiles, en `src/modulos/perfiles/shared/`.

Los estilos específicos de cada componente o módulo se mantienen en archivos CSS separados cuando resulte apropiado.

## Verificaciones antes de integrar cambios

Ejecutar:

```bash
npm run lint
npm run build
npm run test:run
```

Trabajar sobre la rama correspondiente y verificar los cambios antes de integrarlos a `main`.
