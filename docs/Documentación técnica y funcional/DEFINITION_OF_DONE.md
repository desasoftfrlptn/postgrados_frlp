# Definition of Done (DoD) — Fenix Posgrado 2026

**Aprobado por:** Todos los equipos · Semana 2 del kickoff  
**Vigencia:** Todo el proyecto (2026)  
**Ubicación física:** Este documento debe estar impreso y pegado en el espacio de trabajo del equipo.

---

## ¿Qué es el DoD?

El Definition of Done es el **acuerdo compartido** de todos los equipos sobre qué significa que una tarea está *verdaderamente terminada*. Una historia que cumple todos los criterios de su descripción pero no pasa el DoD **no está terminada**.

> "No terminado = no existe."

---

## DoD por Nivel

### Nivel 1: Historia de Usuario (User Story Done)

Una historia de usuario está **Done** cuando cumple TODOS estos criterios:

#### Código
- [ ] El código está en la rama correcta (`feature/US-XXX-descripcion`) y el Pull Request está mergeado a `develop`
- [ ] El PR tiene al menos **1 code review aprobado** por un compañero (no el autor)
- [ ] No hay conflictos de merge sin resolver
- [ ] El código sigue la guía de estilo del equipo: sin warnings de linter

#### Testing
- [ ] **Tests unitarios** escritos para toda la lógica de negocio nueva
- [ ] **Cobertura ≥70%** en el código nuevo (medida con el tool de cobertura del proyecto)
- [ ] **Tests de integración** para cada nuevo endpoint de API
- [ ] **Prueba manual** del flujo completo documentada (screenshot o descripción en el PR)
- [ ] Ningún test existente roto (regresión)

#### Seguridad
- [ ] No se almacenan datos sensibles en logs
- [ ] Las entradas del usuario están validadas y sanitizadas
- [ ] Los endpoints nuevos tienen guard de autenticación/autorización si corresponde
- [ ] No hay secretos (contraseñas, keys) hardcodeados en el código

#### Documentación
- [ ] `CHANGELOG.md` actualizado con el cambio en la sección "Unreleased"
- [ ] Si hay nuevas variables de entorno: `.env.example` actualizado y documentado
- [ ] Si hay nuevos endpoints: Swagger/OpenAPI actualizado

#### Funcional
- [ ] Todos los **criterios de aceptación** de la historia están verificados
- [ ] La funcionalidad funciona en el entorno local de **otro integrante** (no solo en el de quien lo desarrolló)
- [ ] El flujo de usuario no tiene errores en consola del navegador

---

### Nivel 2: Sprint Done

Al finalizar cada sprint de 2 semanas, el estado del proyecto cumple:

- [ ] Todas las historias del sprint están en nivel "User Story Done"
- [ ] La rama `develop` tiene el pipeline de CI en verde (sin fallas)
- [ ] El ambiente local de **todos** los integrantes levanta con `docker-compose up`
- [ ] El backlog está actualizado (historias completadas cerradas, nuevas historias en el backlog)
- [ ] La retrospectiva fue realizada y documentada en Discord/GitHub Discussion

---

### Nivel 3: Release Done (Entrega Parcial / Entrega Final)

Para cada release marcado con un tag (v0.5, v1.0), se verifica además:

- [ ] **`git tag`** creado en `main` con el número de versión correspondiente
- [ ] **Checklist de criterios de aceptación del módulo** (ver SRS Sección 8) completado
- [ ] **Tests de regresión completos** ejecutados sin fallas
- [ ] **Revisión de seguridad básica:** no hay PDFs accesibles por URL directa, headers de seguridad presentes
- [ ] **Lighthouse Score** ≥80 en Performance y Accessibility para las páginas principales
- [ ] **Documentación C4** actualizada (al menos niveles 1 y 2)
- [ ] **README.md** del equipo actualizado con instrucciones actuales de setup
- [ ] **Demo funciona** sin errores en el entorno de presentación (no solo en localhost)

---

## Lo que NO es parte del DoD

Para evitar confusiones:

- ❌ "Funciona en mi máquina" — debe funcionar en la de todos
- ❌ "Está casi listo, falta terminar el test" — sin tests, no está Done
- ❌ "Está en la rama feature sin mergear" — debe estar en `develop` via PR
- ❌ "El swagger lo actualizo después" — la documentación es parte del trabajo, no post-trabajo

---

## Firma de Compromiso

Al inicio del proyecto, cada integrante de cada equipo firma:

> *"Entiendo y me comprometo con el Definition of Done del proyecto Fenix Posgrado 2026. No presionaré para marcar historias como Done si no cumplen todos los criterios, aunque implique no completar el sprint completo."*

| Equipo | Integrante | Rol Inicial | Firma | Fecha |
|--------|-----------|------------|-------|-------|
| | | Product Owner | | |
| | | Tech Lead | | |
| | | Dev Lead | | |
| | | QA/UX Lead | | |

*Este documento completado debe ser fotografiado y subido al repositorio en `/docs/DEFINITION_OF_DONE.md`*

---

*El DoD puede ser revisado en cada Retrospectiva. Los cambios requieren consenso de todo el equipo y aprobación del docente.*
