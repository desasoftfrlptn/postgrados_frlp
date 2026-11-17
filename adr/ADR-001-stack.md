# ADR-001: Elección del Stack Tecnológico

**Estado:** [Propuesto ]  
**Fecha:** 30/05/2026  
**Autor:** [Belén Aylen Martí, Fernandes Facundo,  Gomez Gago Aaron, 
            Nardulli Ornela, Serena Anna Luz, Rodrigo Solange Abigail]

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



"Decidimos usar **[Opcion B]** **Pyhton +** **FastAPI** 
Elegimos python porque es manejado de manera versatil por todo el grupo, y esto facilita la dinamica de trabajo, las correcciones entre nosotros para los pool request y no se pierde tiempo en que alguien del grupo tenga que aprender un nuevo lenguaje."

---

## Consecuencias

### Positivas
- Desarrollo ágil en el backend con una sintaxis limpia y generación automática de la documentación de la API (Swagger).


- Reducción de errores en tiempo de ejecución gracias al fuerte tipado en ambos extremos (Pydantic en backend, TypeScript en frontend).

### Negativas (trade-offs)
- Necesidad de establecer y documentar un flujo de trabajo claro para la gestión de dependencias y entornos virtuales en Python (por ejemplo, definir si usaremos poetry o venv + pip) para evitar problemas de compatibilidad en el equipo.

- Cambio de contexto mental constante (context switching) al tener que programar en dos lenguajes distintos (Python en el backend y TypeScript en el frontend).