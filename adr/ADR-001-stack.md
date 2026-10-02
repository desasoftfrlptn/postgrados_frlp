# ADR-001: Elección del Stack Tecnológico

**Estado:** [Aprobado para el frente de Ingresantes]  
**Fecha:** 17/08/2026  
**Autor:** [Tech Lead del equipo]

---

## Contexto

Este frente solo desarrollará el **wizard de Ingresantes / inscripción pública**. El login y la web principal autenticada quedan fuera de alcance y serán resueltos por otro integrante.

La elección debe balancear:
- **Conocimiento previo del equipo** (curva de aprendizaje)
- **Soporte de la cátedra** (las tecnologías sugeridas tienen soporte garantizado)
- **Madurez del ecosistema** (documentación, librerías, comunidad)
- **Adecuación al problema** (el wizard es principalmente formularios, validación y carga de archivos)

---

## Opciones Evaluadas

### Backend: Opción A — Node.js + NestJS
**Ventajas:** Fuerte tipado con TypeScript, estructura modular similar a Spring (familiar para el área), ORM Prisma muy maduro, excelente para APIs REST.  
**Desventajas:** Node.js asíncrono puede confundir si el equipo no tiene experiencia.

### Backend: Opción B — Python + FastAPI
**Ventajas:** Sintaxis más directa, tipado con Pydantic, muy popular en data science (útil para Módulo D), SQLAlchemy robusto.  
**Desventajas:** Gestión de dependencias más compleja (virtualenv/poetry).

### Frontend: React web + Vite
**Ventajas:** UI rápida para escritorio, ecosistema maduro, fácil de desplegar como sitio estático.  
**Desventajas:** para mobile-ready suele requerir más adaptación posterior.

### Frontend: Expo + React Native + TypeScript
**Ventajas:** base mobile-first desde el inicio, un solo código para validar el wizard en escritorio y luego en móvil, componentes reutilizables, mejor encaje con el objetivo final responsive.  
**Desventajas:** la validación visual en escritorio no es idéntica a web nativa, y algunas piezas del ecosistema web quedan fuera.

---

## Decisión

Decidimos usar **Expo + React Native + TypeScript** para el wizard de Ingresantes porque nos permite construir primero el prototipo de escritorio y terminar en una experiencia móvil responsive sin rehacer la base visual.

El login y la web principal se documentan y desarrollan aparte, por lo que este ADR aplica solo al frente de inscripción pública.

---

## Consecuencias

### Positivas
- Base mobile-ready desde el inicio
- Mejor reutilización del wizard entre escritorio y móvil
- Menor fricción para iterar pantallas de formulario
- Alineación con el objetivo final de versión móvil responsive

### Negativas (trade-offs)
- Menor fidelidad a patrones web clásicos
- Algunas decisiones de layout deben validarse dos veces: escritorio y móvil
