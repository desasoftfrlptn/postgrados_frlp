# Guía de Onboarding por Módulo

Una vez completado el kickoff general (Semanas 1-3), cada equipo usa esta guía como hoja de ruta específica para su módulo asignado. El **Módulo Core** es el punto de partida de todos; el módulo especializado (B, C o D) se desarrolla en paralelo a partir de la semana 14.

---

## Para Todos: Módulo Core

El Core es el corazón del sistema. Sin él, ningún módulo especializado puede funcionar. **Todo equipo lo implementa completo.**

### ¿Qué construye el Core?

1. **Formulario de inscripción público** — El primer punto de contacto del aspirante con el sistema
2. **Gestión documental** — Upload seguro de PDFs
3. **Workflow de estados del legajo** — La máquina de estados que controla el ciclo de vida del aspirante
4. **Búsqueda y listado** — Panel del coordinador para gestionar inscriptos

### Orden de implementación sugerido para el Core

```
Sprint 0 (Sem 4-5): Auth JWT + Modelo de BD + Docker funcional
      ↓
Sprint 1 (Sem 6-7): Formulario de inscripción + validaciones
      ↓
Sprint 1 (Sem 7-8): Upload de PDFs (RF-CORE-002)
      ↓
Sprint 1 (Sem 8-9): Workflow de estados + notificaciones email
      ↓
Sprint 2 (Sem 11-13): Búsqueda, filtros, exportación Excel
      ↓
Sprint 2 (Sem 14): Inicio del módulo especializado asignado
```

### Decisiones que el equipo Core DEBE tomar en la semana 3

| Decisión | Por qué importa | Documentar en |
|----------|----------------|--------------|
| ¿Cómo almacenamos los PDFs? (filesystem vs. BD vs. S3) | Afecta la seguridad y escalabilidad | ADR-002 |
| ¿JWT con refresh token o sin él? | Afecta la experiencia del usuario (sesiones largas) | ADR-003 |
| ¿Cómo implementamos la máquina de estados? (tabla enum vs. clase) | Afecta la mantenibilidad y testabilidad | ADR-004 |
| ¿Cómo manejamos el envío de emails? (sync vs. queue) | Afecta la disponibilidad si el SMTP falla | ASR-xxx |

### Primera tarea práctica (Semana 4)

Antes de escribir código de negocio, crear y validar:

```sql
-- 1. Crear la tabla legajos con todos sus campos
-- 2. Probar la constraint de estado válido:
INSERT INTO legajos (estado) VALUES ('ESTADO_INVALIDO');
-- Debe fallar con error de constraint

-- 3. Probar la transición válida:
UPDATE legajos SET estado = 'PENDIENTE' WHERE estado = 'BORRADOR';
-- Debe funcionar

-- 4. Probar transición inválida (la lógica de negocio debe prevenir esto):
-- Un BORRADOR no puede ir directamente a COMPLETADO
```

---

## Módulo B — Gestión Docente

### Contexto del problema

Hoy, cada docente recibe por email un Excel con los alumnos de su seminario. Tiene que editarlo, guardarlo, y reenviarlo. Si hay cambios en la lista (un alumno se da de baja), nadie actualiza el Excel del docente hasta que él lo note. El módulo B reemplaza todo este proceso.

### ¿Qué construye el Módulo B?

1. **Acceso por link token** — El docente no tiene usuario/contraseña; accede con un link único
2. **Grilla de asistencia** — Tipo spreadsheet, editable inline, con autosave
3. **Cálculo automático** — El porcentaje de asistencia se recalcula con cada cambio
4. **Carga de notas finales** — El estado del seminario se actualiza automáticamente
5. **Recordatorios** — El sistema persigue automáticamente a los docentes que no cargan

### Complejidades técnicas del Módulo B

**La grilla de asistencia es el mayor desafío técnico del módulo.** Requiere:

```
┌────────────────┬──────────┬──────────┬──────────┬─────────┐
│ Alumno         │ 07/04    │ 14/04    │ 21/04    │  % Asis │
├────────────────┼──────────┼──────────┼──────────┼─────────┤
│ García, Ana    │    ✓     │    ✓     │    ✗     │   67%   │
│ López, Juan    │    ✓     │    ✗     │    ✓     │   67%   │
│ Pérez, María   │    ✓     │    ✓     │    ✓     │  100%   │
└────────────────┴──────────┴──────────┴──────────┴─────────┘
```

**Decisiones de diseño que el equipo B debe tomar:**

| Decisión | Opción A | Opción B | Trade-off |
|----------|---------|---------|-----------|
| ¿Cómo guardamos cada cambio? | PATCH por celda (request por cada click) | Batch save (acumula cambios y guarda cada N segundos) | A es más simple pero genera más requests; B es más eficiente pero más compleja |
| ¿La columna de fecha es fija o dinámica? | El docente agrega columnas según dicta clases | Fechas pre-cargadas por el coordinador | A es más flexible; B requiere coordinación previa |
| ¿Cómo prevenimos edición concurrente? | Optimistic locking (versionado de filas) | "Bloqueo visual" (aviso si otro docente está editando) | Implementar solo si la consigna lo requiere |

### Orden de implementación sugerido para B

```
Sem 14: Diseño de la grilla (wireframes aprobados por QA/UX)
Sem 15: Endpoint de acceso por token + listado de estudiantes
Sem 16: Grilla de asistencia con autosave (US-B-002) ← lo más difícil
Sem 17: Cálculo de porcentaje en servidor (BR-002)
Sem 18: Carga de notas + lógica Aprobado/Desaprobado (BR-003)
Sem 19: Descarga Excel + recordatorios automáticos
```

### Test crítico del Módulo B

```python
# Este test debe pasar ANTES de declarar el módulo como Done
def test_calculo_asistencia_excluyendo_clases_futuras():
    """
    DADO: 5 clases programadas, 3 dictadas hasta hoy, alumno asistió a 2
    CUANDO: el sistema calcula el porcentaje
    ENTONCES: debe ser 2/3 = 66.67%, NO 2/5 = 40%
    Las clases futuras NO entran en el denominador (BR-002)
    """
    seminario = crear_seminario_con_5_clases_programadas()
    seminario.dictar_clases(3)  # Solo se dictaron 3
    alumno = crear_alumno_con_asistencias([True, True, False])  # 2 de 3

    assert calcular_porcentaje_asistencia(alumno, seminario) == pytest.approx(66.67, rel=0.01)
```

---

## Módulo C — Seguimiento de Graduación

### Contexto del problema

Hoy no existe ningún sistema que avise cuándo un estudiante está "en riesgo" de no graduarse a tiempo. El equipo de conducción lo descubre en una reunión mensual al revisar manualmente las carpetas. Para entonces, ya pasaron semanas de demora. El módulo C crea un semáforo automático que detecta el riesgo antes de que sea crítico.

### ¿Qué construye el Módulo C?

1. **Registro de TFI y Tesis** — Solo el CPR puede cargar y modificar estos datos
2. **Algoritmo de semaforización** — Calcula el estado de riesgo de cada estudiante diariamente
3. **Dashboard de alertas** — Lista de estudiantes en riesgo, ordenados por criticidad
4. **Notificaciones automáticas** — Aviso al coordinador cuando un estudiante cruza a ROJO

### El algoritmo de semaforización: el núcleo del módulo

Este es el requisito más complejo del sistema. Debe implementarse como una función pura y testeable:

```typescript
// El algoritmo debe estar en la capa de DOMINIO, completamente aislado del framework
// domain/services/semaforo.service.ts

export type EstadoSemaforo = 'VERDE' | 'AMARILLO' | 'ROJO';

export interface DatosParaSemaforo {
  tipoCarrera: 'Especializacion' | 'Maestria' | 'Doctorado';
  fechaInscripcion: Date;
  seminariosObligatoriosTotal: number;
  seminariosAprobados: number;
  tieneTFIRegistrado: boolean;        // Solo Especialización
  tieneDirectorAsignado: boolean;     // Maestría y Doctorado
  tieneFechaCPR: boolean;             // Doctorado
  semanaActual?: Date;                // Inyectable para facilitar tests
}

export function calcularSemaforo(datos: DatosParaSemaforo): EstadoSemaforo {
  const hoy = datos.semanaActual ?? new Date();
  const diasTranscurridos = Math.floor(
    (hoy.getTime() - datos.fechaInscripcion.getTime()) / (1000 * 60 * 60 * 24)
  );
  const duracionDias = duracionPorTipoCarrera(datos.tipoCarrera);
  const porcentajeTiempo = diasTranscurridos / duracionDias;

  // Lógica específica por tipo de carrera
  if (datos.tipoCarrera === 'Especializacion') {
    if (porcentajeTiempo > 0.75 && datos.seminariosAprobados < datos.seminariosObligatoriosTotal)
      return 'ROJO';
    if (porcentajeTiempo > 0.50 && !datos.tieneTFIRegistrado)
      return 'AMARILLO';
  }
  // ... (Maestría y Doctorado similares)

  return 'VERDE';
}

function duracionPorTipoCarrera(tipo: string): number {
  const duraciones = { Especializacion: 730, Maestria: 1095, Doctorado: 1825 };
  return duraciones[tipo];
}
```

### Tests que el Módulo C debe tener OBLIGATORIAMENTE

```typescript
describe('Algoritmo de Semaforización - Especialización', () => {
  
  it('debe ser VERDE si el estudiante está dentro de los tiempos', () => {
    const datos = {
      tipoCarrera: 'Especializacion',
      fechaInscripcion: hace(200, 'dias'),
      seminariosObligatoriosTotal: 8,
      seminariosAprobados: 3,
      tieneTFIRegistrado: false,
      // 200 días de 730 = 27% del tiempo → dentro del umbral
    };
    expect(calcularSemaforo(datos)).toBe('VERDE');
  });

  it('debe ser AMARILLO si superó el 50% del tiempo sin TFI iniciado', () => {
    const datos = {
      tipoCarrera: 'Especializacion',
      fechaInscripcion: hace(370, 'dias'),  // 51% de 730 días
      seminariosAprobados: 5,
      tieneTFIRegistrado: false,  // Sin TFI → Amarillo
    };
    expect(calcularSemaforo(datos)).toBe('AMARILLO');
  });

  it('debe ser ROJO si superó el 75% del tiempo y adeuda seminarios', () => {
    const datos = {
      tipoCarrera: 'Especializacion',
      fechaInscripcion: hace(550, 'dias'),  // 75% de 730 días
      seminariosAprobados: 6,               // Adeuda 2 de 8
      seminariosObligatoriosTotal: 8,
      tieneTFIRegistrado: false,
    };
    expect(calcularSemaforo(datos)).toBe('ROJO');
  });

  it('el VERDE manual del coordinador no debe sobreescribirse automáticamente', () => {
    // Ver BR-008: solo el coordinador puede asignar VERDE manualmente
    // El recálculo automático debe respetar semaforo_manual = true
  });
});
```

### Orden de implementación sugerido para C

```
Sem 14: Diseño del dashboard de alertas (wireframes)
Sem 15: Modelo de datos: Tesis, registro CPR
Sem 16: Algoritmo de semaforización (función pura + tests)
Sem 17: API del semáforo + integración con Core
Sem 18: Dashboard de estudiantes en riesgo
Sem 19: Job programado de recálculo diario + notificaciones
```

---

## Módulo D — Analytics e Inteligencia Académica

### Contexto del problema

Actualmente, el balance del estado de la carrera requiere 4 horas de trabajo manual mensual: cruzar planillas de Excel, contar filas, calcular porcentajes a mano. El módulo D convierte ese proceso en un dashboard que se actualiza automáticamente con cada cambio en el sistema.

### ¿Qué construye el Módulo D?

1. **Dashboard de estadísticas** — Métricas clave por cohorte y carrera
2. **Comparativa entre cohortes** — Tendencias en inscripciones y graduaciones
3. **Exportación profesional a Excel** — Con formato que no avergüenza en una reunión de autoridades
4. **Notificaciones automáticas** — Recordatorios a docentes por inactividad

### La complejidad del Módulo D: datos agregados correctamente

El desafío no es mostrar datos, sino **calcular correctamente las métricas**. Algunas son más sutiles de lo que parecen:

```sql
-- ¿Cuántos estudiantes están "activos" en la cohorte 2024?
-- Respuesta INCORRECTA: contar todos los con estado = 'ACTIVO'
-- Respuesta CORRECTA: excluir los que pasaron a BAJA o GRADUADO después

-- Tasa de desgranamiento CORRECTA:
SELECT 
  c.nombre AS cohorte,
  COUNT(l.id) AS total_inscriptos,
  COUNT(l.id) FILTER (WHERE l.estado = 'BAJA') AS dados_de_baja,
  ROUND(
    COUNT(l.id) FILTER (WHERE l.estado = 'BAJA') * 100.0 / COUNT(l.id), 
    1
  ) AS tasa_desgranamiento_pct
FROM cohortes c
JOIN legajos l ON l.cohorte_id = c.id
WHERE c.nombre = '2024'
GROUP BY c.nombre;

-- ¿Cuándo se van los estudiantes? (en qué punto del cursado)
-- Esto requiere calcular la fecha de baja vs. fecha de inscripción
-- para saber si se van en el primer semestre, segundo, etc.
```

### Diseño del Dashboard

El Módulo D tiene el mayor desafío de UX del proyecto. El dashboard debe ser:
- **Comprensible** para una persona no técnica (la directora de posgrado)
- **Accionable** (debe mostrar qué hacer con la información, no solo datos)
- **Rápido** (<3 segundos de carga con 3 cohortes)

**Propuesta de layout:**

```
┌─────────────────────────────────────────────────────────┐
│  SISTEMA POSGRADO — Dashboard Conducción                │
├─────────────┬───────────────┬───────────────────────────┤
│ Cohorte     │ Inscriptos    │ Retención   │ Graduados   │
│ 2024        │     42        │    78%      │     8       │
│ 2025        │     38        │    89%      │     0       │
│ 2026        │     51        │   100%      │     0       │
├─────────────┴───────────────┴───────────────────────────┤
│ 🔴 Estudiantes en riesgo: 7           [Ver detalle →]   │
├─────────────────────────────────────────────────────────┤
│ Tendencia de inscripciones (últimas 3 cohortes)         │
│     51 ┤                                        ●       │
│     42 ┤              ●                                  │
│     38 ┤                         ●                       │
│        └─────────────────────────────────────────────── │
│               2024             2025            2026     │
└─────────────────────────────────────────────────────────┘
```

### Orden de implementación sugerido para D

```
Sem 14: Diseño del dashboard (wireframes aprobados)
Sem 15: Queries SQL de agregación (probar en DB antes de codificar)
Sem 16: API de analytics → endpoints que retornan los datos del dashboard
Sem 17: Componentes React del dashboard (gráficos con recharts o chart.js)
Sem 18: Exportación a Excel con formato profesional
Sem 19: Sistema de notificaciones automáticas a docentes
```

### Librería de gráficos recomendada

Para React, usá **Recharts** (ya incluida en el stack):

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const data = [
  { cohorte: '2024', inscriptos: 42, graduados: 8 },
  { cohorte: '2025', inscriptos: 38, graduados: 0 },
  { cohorte: '2026', inscriptos: 51, graduados: 0 },
];

export function TendenciaInscripciones() {
  return (
    <LineChart width={500} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="cohorte" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="inscriptos" stroke="#2563eb" name="Inscriptos" />
      <Line type="monotone" dataKey="graduados" stroke="#16a34a" name="Graduados" />
    </LineChart>
  );
}
```

---

## Preguntas Frecuentes por Módulo

### "¿Mi módulo necesita auth o puede ser público?"

**Core (formulario de inscripción):** El formulario inicial es **público** (sin login). Pero la gestión de legajos requiere JWT con rol `COORDINADOR`.

**Módulo B (Docente):** El docente accede con un **token de link**, no con usuario/contraseña. El token tiene fecha de expiración.

**Módulo C y D:** Requieren JWT con rol `COORDINADOR` o `CPR` según la operación.

---

### "¿Cómo pruebo el envío de emails en desarrollo?"

Usá **MailHog** (ya incluido en el docker-compose):
1. El sistema envía emails normalmente a `smtp://mailhog:1025`
2. Los emails NO llegan a ninguna bandeja real
3. Los podés ver en `http://localhost:8025`

---

### "¿Cómo coordino con otro equipo que también usa los datos del Core?"

Los contratos de API están definidos en el `docs/BFD.md` (sección 5) y en `docs/ARQUITECTURA.md` (sección 8.3). Si necesitás un endpoint que no existe, abrís un **issue en GitHub** pidiendo que el equipo Core lo implemente, y coordinan en el canal de Discord.

---

*Esta guía se complementa con la Guía de Kickoff (semanas 1-3) y la Guía de Arquitectura.*
