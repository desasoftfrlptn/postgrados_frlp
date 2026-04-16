**Business Flow Diagram (BFD)** completo del proyecto "Fenix Posgrado", diseñado como documento de arquitectura de negocio para que los equipos de desarrollo comprendan las interacciones sistémicas antes de codificar.

---

## 1. Diagrama General de Flujo de Negocio (Nivel 0)

```mermaid
flowchart TB
    subgraph ACTORES[" ACTORES EXTERNOS"]
        ASP[ASPIRANTE<br/>Postulante potencial]
        EST[ESTUDIANTE<br/>Inscripto activo]
        DOC[DIRECTOR/DOCENTE<br/>Carga académica]
        CON[CONDUCCIÓN<br/>Administra procesos]
        CPR[COMISIÓN CPR<br/>Valida tesis]
    end

    subgraph MOD_CORE[" MÓDULO CORE (Obligatorio)"]
        direction TB
        WEB[Portal Web Público<br/>Formulario de Inscripción]
        VAL[Validación Documental<br/>Workflow Estados]
        LEG[Legajo Digital<br/>Gestión Documental]
        BUS[Buscador & Listados<br/>Por Cohorte/Estado]
    end

    subgraph MOD_B[" MÓDULO B: Gestión Docente"]
        GEST_DOC[Planilla Digital<br/>Asistencia/Notas]
        CALC[Cálculo Automático<br/>% Asistencia]
    end

    subgraph MOD_C[" MÓDULO C: Graduación"]
        TESIS[Registro TFI/Tesis<br/>Director/Codirector]
        SEMA[Semaforización<br/>Alertas Temporales]
        ADE[Adeudamiento<br/>Seguimiento Seminarios]
    end

    subgraph MOD_D[" MÓDULO D: Analytics"]
        REP[Reportes Ejecutivos<br/>Estadísticas]
        EXP[Exportación<br/>Excel/PDF]
        ALERT[Notificaciones<br/>Automáticas]
    end

    subgraph INFRA[" INFRAESTRUCTURA"]
        DB[(Base de Datos<br/>Unificada)]
        STG[Storage de Documentos<br/>PDFs Escaneados]
    end

    %% FLUJOS PRINCIPALES
    ASP -->|1. Completa Ficha| WEB
    ASP -->|2. Adjunta PDFs| WEB
    WEB -->|3. Persiste Datos| DB
    WEB -->|4. Almacena Archivos| STG
    
    CON -->|5. Revisa & Aprueba| VAL
    VAL -->|6. Cambia Estado| LEG
    LEG -->|7. Consulta Estado| ASP
    
    EST -->|8. Accede a Perfil| LEG
    
    CON -->|9. Asigna Seminarios| MOD_B
    DOC -->|10. Carga Asistencia| GEST_DOC
    GEST_DOC -->|11. Calcula| CALC
    CALC -->|12. Actualiza| DB
    
    CPR -->|13. Registra Tesis| TESIS
    TESIS -->|14. Alimenta| SEMA
    SEMA -->|15. Visualiza Alertas| CON
    
    DB -->|16. Agrega Datos| MOD_D
    CON -->|17. Genera Reportes| REP
    REP -->|18. Exporta| EXP
    MOD_D -->|19. Envía Emails| DOC
```

---

## 2. Descomposición de Procesos por Módulo

### 2.1 Módulo Core: Proceso de Admisión (AS-IS vs TO-BE)

#### Flujo Actual (AS-IS) - Problemático
```mermaid
flowchart LR
    A[Aspirante envía email] --> B[Secretaría recibe<br/>en bandeja de entrada]
    B --> C{Revisión manual}
    C -->|OK| D[Carga en Excel<br/>Carpeta física]
    C -->|Faltan datos| E[Email de vuelta<br/>Demora 48-72hs]
    D --> F[Envío a CPR<br/>Por correo físico]
    F --> G[Acumulación de<br/>archivos sueltos]
    
    style A fill:#ffcccc
    style G fill:#ffcccc
    style E fill:#ffcccc
```

#### Flujo Propuesto (TO-BE) - Digitalizado
```mermaid
flowchart LR
    A[Aspirante accede<br/>a URL única] -->|Validación JS| B{Datos completos?}
    B -->|No| C[Feedback inmediato<br/>Campos resaltados]
    B -->|Sí| D[Upload PDFs<br/>Validación MIME]
    D --> E[Estado: PENDIENTE]
    E --> F[Notificación automática<br/>a Conducción]
    F --> G[Revisión en dashboard]
    G -->|Aprobado| H[Estado: COMPLETADO<br/>Legajo generado]
    G -->|Observado| I[Estado: EN REVISIÓN<br/>Comentarios al aspirante]
    I --> A
    
    style H fill:#ccffcc
    style E fill:#ffffcc
```

**Puntos de Decisión (Gateways) críticos:**
- **G1:** ¿Documentación válida? (Chequeo de virus/formato)
- **G2:** ¿Cupos disponibles en cohorte? (Validación contra BD)
- **G3:** ¿Requiere beca? (Derivación a flujo paralelo de evaluación económica)

---

### 2.2 Interacción Módulo Core ↔ Módulo B (Docentes)

```mermaid
sequenceDiagram
    participant CON as Conducción
    participant CORE as Módulo Core
    participant DB as Base de Datos
    participant MOD_B as Módulo Docente
    participant DOC as Docente
    
    CON->>CORE: Cierra Inscripción<br/>Cierra Cohorte
    CORE->>DB: Congela lista de<br/>estudiantes activos
    CON->>MOD_B: Asigna Docente a<br/>Seminario X (2026)
    MOD_B->>DB: Lee inscriptos al<br/>seminario
    MOD_B->>DOC: Genera planilla<br/>personalizada
    loop Cada clase
        DOC->>MOD_B: Marca asistencia<br/>(checkbox por fecha)
    end
    DOC->>MOD_B: Ingresa nota final
    MOD_B->>DB: Calcula % asistencia<br/>Guarda calificación
    MOD_B->>DB: Determina condición<br/>(Regular/Aprobado/Libre)
    Note over DB,M: Actualiza estado<br/>académico en tiempo real
```

---

### 2.3 Flujo del Módulo C (Seguimiento de Graduación)

```mermaid
flowchart TB
    subgraph INGRESO["Inicio del Seguimiento"]
        IN[Inscripción en<br/>Especialización/Maestría/Doctorado]
        CONF[Tipo de Carrera<br/>+ Fecha de Inscripción]
    end
    
    subgraph PROCESO["Cálculo del Semáforo"]
        CALC[Algoritmo de<br/>Progreso Temporal]
        REG[Reglas:<br/>Esp: 2 años / Maes: 3 años / Doc: 5 años]
        SEM{Estado del<br/>Semáforo}
    end
    
    subgraph ALERTAS["Alertas y Acciones"]
        VERDE[🟢 Verde<br/>Dentro de tiempos<br/>Seminarios al día]
        AMARILLO[🟡 Amarillo<br/>50% tiempo transcurrido<br/>TFI no iniciado]
        ROJO[🔴 Rojo<br/>75% tiempo +<br/>Adeuda seminarios]
        NOTIF[Notificación a<br/>Conducción]
    end
    
    subgraph CPR_INTERAC["Intervención CPR"]
        TESIS[Alta de Tesis<br/>Título/Directores]
        APR[Resolución CPR<br/>Fecha/Numero]
    end
    
    IN --> CONF
    CONF --> CALC
    CALC --> REG
    REG --> SEM
    
    SEM -->|Progreso OK| VERDE
    SEM -->|Riesgo moderado| AMARILLO
    SEM -->|Crítico| ROJO
    
    ROJO --> NOTIF
    AMARILLO --> NOTIF
    
    TESIS --> APR
    APR -->|Actualiza| SEM
    
    VERDE --> ESTADO[Perfil Estudiante<br/>Visualización]
    ROJO --> ESTADO
```

**Regla de Negocio Crítica (para el ASR):**
```
Si (Fecha_Actual - Fecha_Inscripción) > (Duración_Carrera * 0.75) 
   Y (Seminarios_Aprobados < Total_Seminarios_Obligatorios * 0.8) 
Entonces Estado = ROJO
```

---

### 2.4 Flujo del Módulo D (Analytics y Reporting)

```mermaid
flowchart LR
    subgraph FUENTES["Fuentes de Datos"]
        DB_CORE[(Datos Core)]
        DB_ACAD[(Histórico<br/>Académico)]
        DB_DOC[(Datos Docentes)]
    end
    
    subgraph ETL["Procesamiento"]
        AGG[Agregaciones<br/>SQL/Views]
        CALC_MET[ Métricas:<br/>Desgranamiento, Retención]
    end
    
    subgraph OUTPUTS["Salidas"]
        DASH[Dashboard Visual<br/>Gráficos de Tendencias]
        EXCEL[Exportación Excel<br/>Para Dirección Posgrado]
        AUTO[Alertas Automáticas<br/>Recordatorios Docentes]
    end
    
    DB_CORE --> AGG
    DB_ACAD --> AGG
    DB_DOC --> AGG
    
    AGG --> CALC_MET
    CALC_MET --> DASH
    CALC_MET --> EXCEL
    
    DB_DOC -->|Trigger<br/>Fecha límite| AUTO
```

---

## 3. Matriz de Responsabilidades (RACI simplificado)

| Proceso | Aspirante | Estudiante | Docente | Conducción | CPR | Sistema (Auto) |
|---------|-----------|------------|---------|------------|-----|----------------|
| **Inscripción Inicial** | R | - | - | A | - | C |
| **Validación Documental** | C | - | - | R/A | I | C |
| **Carga Académica** | - | I | R/A | I | - | C |
| **Seguimiento Tesis** | - | I | C | I | R/A | C |
| **Generación Reportes** | - | - | I | R/A | I | C |
| **Alertas Temporales** | I | I | I | I | I | R/A |

*Leyenda: R=Responsable, A=Aprueba, C=Consultado/Informado, I=Informado*

---

## 4. Diagrama de Estados del Legajo (State Machine)

Crítico para el desarrollo del Módulo Core:

```mermaid
stateDiagram-v2
    [*] --> Borrador: Inicio inscripción
    
    Borrador --> Pendiente: Guardar progreso
    Borrador --> [*]: Abandono (>30 días)
    
    Pendiente --> EnRevision: Enviar a revisión<br/>(Documentación completa)
    Pendiente --> Observado: Faltan documentos<br/>(detectado por sistema)
    
    Observado --> Pendiente: Aspirante corrige<br/>y reenvía
    
    EnRevision --> Aprobado: Conducción valida
    EnRevision --> Rechazado: Documentación<br/>fraudulenta
    
    Aprobado --> Activo: Inicio de cursada<br/>(Migración a Estudiante)
    Aprobado --> Baja: No confirma matrícula
    
    Activo --> Graduado: Aprobación final
    Activo --> Riesgo: Módulo C detecta<br/>retraso académico
    
    Riesgo --> Activo: Regularización
    Riesgo --> Baja: Abandono confirmado
    
    Graduado --> [*]
    Rechazado --> [*]
    Baja --> [*]
```

---

## 5. Puntos de Integración entre Módulos (API Contracts)

Para que los equipos puedan trabajar en paralelo, defino los contratos de integración:

### 5.1 Core → Docente (Módulo B)
```
GET /api/core/estudiantes/{cohorte}/{seminario_id}
Headers: Authorization: Bearer {token_docente}
Response: {
  "estudiantes": [
    {
      "legajo_id": "uuid",
      "nombre_completo": "string",
      "email": "string",
      "carrera_grado": "string",
      "estado_legajo": "Activo"
    }
  ]
}
```

### 5.2 Docente → Core (Actualización)
```
POST /api/docentes/asistencias
Body: {
  "seminario_id": "uuid",
  "fecha_clase": "2026-04-07",
  "asistencias": [
    {"legajo_id": "uuid", "presente": true}
  ]
}
```

### 5.3 Core → Graduación (Módulo C)
```
Trigger: Evento "Estudiante Activo"
Payload: {
  "estudiante_id": "uuid",
  "tipo_carrera": "Especializacion|Maestria|Doctorado",
  "fecha_inscripcion": "2026-03-15",
  "seminarios_obligatorios": 8
}
```

---

## 6. Checklist de Validación del BFD

Antes de comenzar el desarrollo, cada equipo debe verificar que entiende:

- [ ] **¿Qué dispara el cambio de estado "Aspirante" a "Estudiante"?** (Resp: Aprobación de legajo + Confirmación de matrícula)
- [ ] **¿Quién puede ver los PDFs subidos?** (Resp: Solo Conducción y el propio Aspirante durante edición)
- [ ] **¿Qué sucede si un docente no carga asistencia en 48hs?** (Resp: Módulo D envía recordatorio automático - si se implementa D)
- [ ] **¿Cómo se calcula el color del semáforo?** (Resp: Regla basada en fecha inscripción vs. progreso académico)
- [ ] **¿Los aspirantes pueden ver el semáforo?** (Resp: No, es información interna de Conducción/CPR según requerimiento)