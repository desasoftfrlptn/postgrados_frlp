# ADR-001: Elección del Stack Tecnológico

**Estado:** [Propuesto — el equipo debe completar y aprobar]  
**Fecha:** ___/05/2026  
**Autor:** [Tech Lead del equipo]

---

## Contexto

Debemos elegir las tecnologías para implementar el sistema Fenix Posgrado antes de comenzar el desarrollo. La elección debe balancear:
- **Conocimiento previo del equipo** (curva de aprendizaje)
- **Soporte de la cátedra** (las tecnologías sugeridas tienen soporte garantizado)
- **Madurez del ecosistema** (documentación, librerías, comunidad)
- **Adecuación al problema** (el sistema es principalmente CRUD + lógica de negocio)

---

## Opciones Evaluadas

### Backend: Opción A — Node.js + NestJS
**Ventajas:** Fuerte tipado con TypeScript, estructura modular similar a Spring (familiar para el área), ORM Prisma muy maduro, excelente para APIs REST.  
**Desventajas:** Node.js asíncrono puede confundir si el equipo no tiene experiencia.

### Backend: Opción B — Python + FastAPI
**Ventajas:** Sintaxis más directa, tipado con Pydantic, muy popular en data science (útil para Módulo D), SQLAlchemy robusto.  
**Desventajas:** Gestión de dependencias más compleja (virtualenv/poetry).

### Frontend: React 18 + TypeScript + Vite
**Ventajas:** Ecosistema más maduro, TailwindCSS simplifica el estilo, componentes reutilizables.  
**Alternativa:** Vue 3 (similar complejidad, menos demanda laboral en Argentina actualmente).

---

## Decisión

[El equipo debe completar esta sección]

"Decidimos usar **[backend elegido]** y **React 18 + TypeScript** porque [razones específicas del equipo]."

---

## Consecuencias

### Positivas
- [El equipo completa]

### Negativas (trade-offs)
- [El equipo completa]
