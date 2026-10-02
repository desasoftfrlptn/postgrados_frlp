# Data Mapping: Frontend to Backend (FastAPI)

This document describes how the data collected in the **Ingresantes Wizard** frontend (React Native/Expo) maps to the expected backend models in **FastAPI**.

## Data Structure Overview

The wizard collects data in 4 steps. For the backend, this data should ideally be sent as a single JSON object or in chunks if using a stateful multi-step API.

### Step 1: Personal Data (`datos_personales`)
| Frontend Label | Field Key | Type | Notes |
|----------------|-----------|------|-------|
| Nombre(s) | `nombres` | string | |
| Apellido(s) | `apellidos` | string | |
| DNI | `dni` | string | Validated as numeric |
| Nacionalidad | `nacionalidad` | string | ISO Alpha-2 code suggested (e.g., "AR") |
| Fecha de Nacimiento | `fecha_nacimiento` | string (ISO 8601) | Expected format: YYYY-MM-DD |
| Género | `genero` | enum | Options: Masculino, Femenino, No binario, Otro |
| ¿Posee discapacidad? | `posee_discapacidad` | boolean | |

### Step 2: Contact & Residence (`contacto_residencia`)
| Frontend Label | Field Key | Type | Notes |
|----------------|-----------|------|-------|
| Teléfono celular | `telefono` | string | E.164 format suggested |
| Correo electrónico | `email` | string | Validated email |
| Provincia | `provincia` | string | |
| Localidad | `localidad` | string | |
| Calle | `calle` | string | |
| Número | `numero` | string | |
| Piso / Depto | `piso_depto` | string | Optional |
| Código Postal | `codigo_postal` | string | |

### Step 3: Background & Motivations (`antecedentes_motivaciones`)
| Frontend Label | Field Key | Type | Notes |
|----------------|-----------|------|-------|
| Título de grado | `titulo_grado` | string | |
| Institución | `institucion` | string | |
| Año de graduación | `anio_graduacion` | integer | |
| Carrera a inscribirse | `carrera_id` | integer/UUID | Foreign key to Offerings |
| ¿Posee otro posgrado?| `posee_posgrado` | boolean | |
| ¿Por qué esta carrera?| `motivacion_texto` | string | Max 500 chars |
| ¿Trabaja en el área? | `trabaja_en_area` | boolean | |
| ¿Cómo nos conoció? | `fuente_conocimiento` | enum | |

### Step 4: Documentation & Files (`archivos`)
*Files should be sent as `multipart/form-data`.*

| Frontend Label | Field Key |
|----------------|-----------|
| DNI (frente/dorso) | `file_dni` |
| Título universitario | `file_titulo` |
| Certificado analítico| `file_analitico` |
| Partida de nacimiento| `file_partida` |
| Foto carnet | `file_foto` |
| CV actualizado | `file_cv` |
| Formulario de beca | `file_beca` (optional) |

---

## Sample FastAPI Schema (Pydantic)

```python
from pydantic import BaseModel, EmailStr
from datetime import date
from typing import Optional

class InscripcionBase(BaseModel):
    # Step 1
    nombres: str
    apellidos: str
    dni: str
    nacionalidad: str
    fecha_nacimiento: date
    genero: str
    posee_discapacidad: bool = False
    
    # Step 2
    telefono: str
    email: EmailStr
    provincia: str
    localidad: str
    calle: str
    numero: str
    piso_depto: Optional[str] = None
    codigo_postal: str
    
    # Step 3
    titulo_grado: str
    institucion: str
    anio_graduacion: int
    carrera_id: int
    posee_posgrado: bool = False
    motivacion_texto: str
    trabaja_en_area: bool = False
    fuente_conocimiento: str
    
    # Beca
    solicita_beca: bool = False
    tipo_beca: Optional[str] = None
```

## Implementation Strategy
1. **Frontend State**: Use a global state (Context or Zustand) to accumulate data across steps.
2. **Persistence**: Use `AsyncStorage` to save progress locally in case of app close.
3. **Submission**: Step 4 sends the JSON payload + files using `FormData`.
