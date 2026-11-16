# Entrega 2: Frontend - Sistema de Posgrado UTN FRLP

> Este documento conserva la descripción de la iteración registrada el 25/08/2026. La sección
> de actualización al final registra el estado posterior y diferencia las vistas
> conectadas de los prototipos que todavía usan datos simulados.

## Descripción General
Esta entrega corresponde a la primera iteración del frontend para el Sistema de Gestión Académica de Posgrado. La implementación establece la estructura base de la aplicación tipo SPA (Single Page Application) y cubre las vistas principales del **Módulo Core** y de los **módulos de especialidad** (Gestión Docente y Analytics).

En esa iteración, la interfaz se encontraba maquetada y funcional a nivel cliente, operando con datos simulados (mocks) para demostrar el flujo de usuario y la interacción de los componentes antes de la integración con el backend.

## Stack Tecnológico
*   **Core:** React
*   **Lenguaje:** TypeScript
*   **Bundler:** Vite
*   **Estilos:** Tailwind CSS

## Estructura del Proyecto (`/frontend`)
La arquitectura del código sigue un enfoque modular, separando la lógica de presentación, las vistas y los datos:

*   `/src/assets`: Recursos estáticos.
*   `/src/layouts`: Componentes envolventes que definen la estructura visual de las páginas.
    *   `MainLayout.tsx`: Estructura para el área pública (Header superior).
    *   `CoordinadorLayout.tsx`: Estructura para el área privada de gestión, incluyendo el menú lateral (Sidebar).
*   `/src/mocks`: Almacenamiento de datos estáticos de prueba (`estadisticas.ts`, `legajos.ts`) para alimentar las tablas y gráficos.
*   `/src/pages`: Vistas principales de la plataforma.
*   `/src/types`: Definiciones centralizadas de interfaces de TypeScript para mantener un tipado estricto.

## Módulos y Vistas Implementadas

### 1. Módulo Core: Admisión de Aspirantes
*   **Vista:** `InscripcionAspirante.tsx`
*   **Descripción:** Formulario interactivo estructurado como un *Wizard* de 3 pasos (Datos Personales, Datos de Contacto/Académicos, y Carga de Documentos).
*   **Características:** Manejo de estado local para avanzar o retroceder entre secciones, validaciones básicas en inputs y selectores visuales para la simulación de carga de archivos PDF.

### 2. Módulo B: Gestión Docente
*   **Vista:** `GestionDocente.tsx`
*   **Descripción:** Interfaz dedicada al profesorado para el control de la cursada.
*   **Características:** Grilla interactiva que permite registrar la asistencia mediante selectores rápidos (*toggles*) y casilleros de texto para la carga de calificaciones finales por estudiante.

### 3. Módulo D: Panel de Conducción (Analytics)
*   **Vista:** `PanelConduccion.tsx`
*   **Descripción:** Dashboard estratégico orientado a la coordinación y dirección académica.
*   **Características:** Indicadores clave de rendimiento (KPIs) dinámicos que resumen el volumen de inscriptos, graduados y estudiantes en riesgo. Incluye filtros por Cohorte y Carrera, y un gráfico de líneas para visualizar la evolución de las métricas.

## Aclaración
Los datos y procesado de `inputs` (para la verificación) será transferida y/o replicada en el Backend con el objetivo de mantener una seguridad e integridad de los datos.

## Ejecución del Entorno de Desarrollo
Para inicializar el proyecto localmente:

1. Ubicarse en el directorio del frontend: `cd frontend`
2. Instalar las dependencias: `npm install`
3. Levantar el servidor local de Vite: `npm run dev`

---

## Actualización del avance — 16/11/2026

- **Inscripción:** `InscripcionAspirante.tsx` envía el formulario y los archivos al endpoint backend. Los borradores se conservan localmente en el navegador.
- **Autenticación:** existe flujo de login y administración de sesión conectado a los endpoints de autenticación.
- **Gestión de legajos:** la pantalla sigue operando con datos locales; no consume un endpoint backend de listado. El workflow de estados está implementado en el backend, pero aún no está integrado a esta vista.
- **Gestión docente:** la grilla utiliza datos de ejemplo y no tiene endpoints de asistencia o calificaciones conectados.
- **Panel de conducción:** las métricas provienen de mocks; el backend de analytics sigue pendiente.
- **Backend Core:** están disponibles la inscripción, la validación de documentos obligatorios durante el envío, la solicitud de beca, la descarga protegida de PDFs y el workflow de estados. La consulta de checklist documental y el listado de legajos aún no están disponibles como endpoints.

Esta actualización describe el estado del código al momento de revisión; no reemplaza los criterios de aceptación definidos en el SRS y el backlog.
