# Entrega 2: Frontend - Sistema de Posgrado UTN FRLP

## Descripción General
Esta entrega corresponde a la primera iteración del frontend para el Sistema de Gestión Académica de Posgrado. La implementación establece la estructura base de la aplicación tipo SPA (Single Page Application) y cubre las vistas principales del **Módulo Core** y de los **módulos de especialidad** (Gestión Docente y Analytics).

La interfaz se encuentra maquetada y funcional a nivel cliente, operando con datos simulados (mocks) para demostrar el flujo de usuario y la interacción de los componentes antes de la integración con el backend.

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