# Rúbrica de Evaluación — Fenix Posgrado 2026

**Cátedra:** Desarrollo de Software · UTN FRLP  
**Modalidad:** Evaluación continua por competencias + entrega final  
**Sistema de notas:** 1 a 10 (aprobación: ≥4 en cada criterio)

---

## 1. Estructura de la Nota Final

| Componente | Peso | Cuándo se evalúa |
|-----------|:----:|-----------------|
| Kickoff y documentación inicial | 15% | Semana 3 |
| Entrega Parcial v0.5 (Core) | 25% | Semana 16 (31/07) |
| Entrega Final v1.0 | 40% | Semana 28 (23/10) |
| Exposición y defensa oral | 15% | Semanas 30-31 (Nov) |
| Proceso (commits, reviews, retrospectivas) | 10% | Continuo |

---

## 2. Rúbrica por Hito

### 2.1 Kickoff (15%) — Semana 3

| Criterio | Excelente (9-10) | Satisfactorio (6-8) | Básico (4-5) | Insuficiente (<4) |
|----------|:---------------:|:------------------:|:------------:|:-----------------:|
| **Repositorio** | Estructura completa, README claro, `docker-compose up` funciona en todas las máquinas | Repo funcional con leves inconsistencias en documentación | Repo levanta pero con instrucciones incompletas | No se puede clonar o no levanta |
| **Team Charter** | Acuerdos concretos, riesgos identificados, firmado por todos | Charter completo pero genérico | Charter incompleto | No presentado |
| **ASR** | ≥3 ASR con escenarios de falla concretos y decisiones justificadas | 3 ASR correctos pero con escenarios vagos | 2 ASR mínimos | Menos de 2 ASR |
| **Backlog** | ≥15 historias con criterios de aceptación verificables, estimadas en story points | ≥15 historias pero con criterios incompletos | ≥10 historias en GitHub Projects | Menos de 10 historias |

---

### 2.2 Entrega Parcial v0.5 — Core Completo (25%)

| Criterio | Peso en hito | Indicadores |
|----------|:-----------:|------------|
| **Funcionalidad** | 40% | El flujo aspirante→estudiante funciona end-to-end sin errores. Todos los RF-CORE-[M] implementados. |
| **Calidad técnica** | 30% | Tests con ≥70% de cobertura en lógica de negocio. Pipeline CI verde. Sin vulnerabilidades críticas. |
| **Seguridad** | 20% | Los PDFs no son accesibles por URL directa. Los endpoints autenticados no responden sin JWT válido. |
| **Proceso** | 10% | Historial de commits limpio. PRs con code reviews. CHANGELOG actualizado. |

**Criterios de corte para el v0.5 (si no se cumplen, nota máxima = 4):**
- [ ] `git tag v0.5` existe en el repositorio
- [ ] Un aspirante puede inscribirse completamente (formulario + PDFs) sin errores
- [ ] El coordinador puede aprobar el legajo y el aspirante recibe email de notificación
- [ ] Los tests pasan en el pipeline de CI (no solo localmente)

---

### 2.3 Entrega Final v1.0 (40%)

#### Dimensión 1: Core + Módulo Especializado (50% de la nota del hito)

| Criterio | Excelente (9-10) | Satisfactorio (6-8) | Básico (4-5) |
|----------|:---------------:|:------------------:|:------------:|
| **Funcionalidad** | Todos los RF [M] y al menos 3 RF [S] implementados y funcionales | Todos los RF [M] implementados | ≥80% de los RF [M] |
| **Integración** | Core y módulo se integran transparentemente via API definida | Integración funcional con workarounds documentados | Integración parcial |
| **Reglas de negocio** | Todas las BR del módulo implementadas y testeadas | BR principales implementadas | ≥70% de las BR |

#### Dimensión 2: Calidad Técnica (30% de la nota del hito)

| Criterio | Excelente (9-10) | Satisfactorio (6-8) | Básico (4-5) |
|----------|:---------------:|:------------------:|:------------:|
| **Tests** | ≥70% cobertura, tests de integración para todos los endpoints críticos, E2E para flujo principal | ≥70% cobertura en lógica de negocio | Tests presentes pero cobertura <70% |
| **Seguridad** | Sin vulnerabilidades OWASP Top 10 críticas. Headers configurados. Rate limiting. | Sin vulnerabilidades críticas, warnings aceptados | Solo las seguridades básicas (JWT) |
| **Código** | Arquitectura limpia, sin deuda técnica significativa, código revieweado por todos | Arquitectura correcta con algunos code smells documentados | Funciona pero con code smells no documentados |
| **DevOps** | CI/CD completo. Deploy funcionando. Monitoreo básico. | CI/CD con lint + tests. Deploy manual documentado. | CI básico corriendo |

#### Dimensión 3: Documentación (20% de la nota del hito)

| Criterio | Excelente (9-10) | Satisfactorio (6-8) | Básico (4-5) |
|----------|:---------------:|:------------------:|:------------:|
| **Técnica** | C4 completo (niveles 1-3), ADRs actualizados, Swagger completo | C4 niveles 1-2, endpoints documentados | README actualizable, Swagger básico |
| **Usuario** | Manual de usuario para cada rol, guía de instalación, CHANGELOG completo | Guía de instalación clara, CHANGELOG | README con instrucciones básicas |

---

### 2.4 Exposición y Defensa Oral (15%)

**Formato:** Demo de 20 minutos + preguntas de 10 minutos por equipo.

| Criterio | Indicadores de excelencia |
|----------|--------------------------|
| **Demo en vivo** | El sistema funciona sin errores durante la demo. Se muestra el flujo completo de al menos 2 roles. |
| **Justificación técnica** | El equipo puede explicar POR QUÉ tomó cada decisión de arquitectura (no solo QUÉ hizo). |
| **Manejo de preguntas** | Cada integrante puede responder preguntas sobre cualquier parte del sistema (no solo "su parte"). |
| **Conocimiento individual** | El docente puede preguntar a cualquier integrante sobre cualquier componente del sistema. |

> **Importante:** Si durante la exposición se detecta que un integrante desconoce partes del sistema que le corresponden, su nota individual puede diferir de la nota del equipo.

---

### 2.5 Proceso Continuo (10%)

Se evalúa durante todo el cuatrimestre:

| Indicador | Cómo se mide |
|-----------|-------------|
| **Commits regulares** | Historial de git: todos los integrantes tienen commits. Sin commits de "todo junto al final". |
| **Pull Requests** | Todos los PRs tienen al menos 1 review. Los reviews son comentarios útiles, no "LGTM" vacíos. |
| **Retrospectivas** | Documentadas en el repositorio. Muestran reflexión genuina y mejoras de sprint a sprint. |
| **Comunicación de bloqueos** | Issues de GitHub usados para reportar problemas técnicos. No se bloquea silenciosamente. |
| **Rotación de roles** | Todos los integrantes ejercieron al menos 2 roles diferentes durante el proyecto. |

---

## 3. Criterios de Desaprobación Automática

Las siguientes situaciones resultan en nota máxima **3 (tres)** sin importar el resto:

- El sistema no puede levantarse con `docker-compose up` en el entorno de evaluación
- Un integrante realizó 0 (cero) commits durante el proyecto
- Se detecta copia de código de otro equipo sin atribución (plagio)
- Los tests del pipeline de CI no pasan en la entrega final
- Hay credenciales (contraseñas, API keys) commiteadas en el repositorio

---

## 4. Bonificaciones (hasta +1 punto sobre la nota final)

| Bonificación | Descripción | Puntos |
|-------------|------------|:------:|
| **Deploy en producción** | El sistema está accesible en una URL pública (servidor de la facultad o cloud gratuito) | +0.5 |
| **Demo con usuario real** | La exposición incluye a la secretaria de posgrado u otro usuario real probando el sistema | +0.5 |
| **Innovación técnica justificada** | El equipo implementó una tecnología no sugerida con una justificación sólida en un ADR | +0.25 |
| **Cobertura excepcional** | Tests con ≥85% de cobertura en toda la aplicación (no solo lógica de negocio) | +0.25 |

---

## 5. Evaluación Individual vs. Grupal

La nota del proyecto es **grupal**. Sin embargo, el docente puede ajustar la nota individual (±1.5 puntos) si:

- **Sobresale claramente** (demuestra dominio de todo el sistema, generó la mayoría de las decisiones técnicas)
- **No participó equitativamente** (pocos commits, desconoce partes del sistema, no rotó roles)

Cualquier ajuste individual debe estar fundamentado con evidencia objetiva (historial de git, participación en reviews, observaciones durante el proyecto).

---

*Esta rúbrica puede ajustarse por el docente hasta la semana 4. Cambios se comunican con 1 semana de anticipación.*
