export type EstadoLegajo =
  | "BORRADOR"
  | "PENDIENTE"
  | "EN_REVISION"
  | "OBSERVADO"
  | "COMPLETADO"
  | "ACTIVO"
  | "VENCIDO"
  | "RECHAZADO"
  | "BAJA"
  | "GRADUADO";

export type TipoCarrera = "Especializacion" | "Maestria" | "Doctorado";

export type Semaforo = "VERDE" | "AMARILLO" | "ROJO";

export type Rol = "ASPIRANTE" | "DOCENTE" | "COORDINADOR" | "CPR" | "ADMIN";

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
}
