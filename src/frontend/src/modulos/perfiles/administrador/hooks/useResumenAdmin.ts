import { useEffect, useState } from "react";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";

export interface RegistroAdmin {
  id: string;
  activo: boolean;
  nombre?: string;
}
interface Usuario extends RegistroAdmin { tipo_usuario: string }
interface Cohorte { id: string; abierta: boolean; nombre?: string; carrera_id?: string; anio?: number }
export type ResumenAdmin = {
  usuarios: Usuario[] | null;
  carreras: RegistroAdmin[] | null;
  seminarios: RegistroAdmin[] | null;
  cohortes: Cohorte[] | null;
  admisiones: Record<string, number> | null;
};
const vacio: ResumenAdmin = {
  usuarios: null, carreras: null, seminarios: null, cohortes: null, admisiones: null,
};

// Una consulta fallida no oculta las demas metricas disponibles.
export function useResumenAdmin() {
  const { user } = useAuth();
  const token = user?.token;
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState<{
    token: string; intento: number; datos: ResumenAdmin;
  } | null>(null);
  useEffect(() => {
    if (!token) return;
    let vigente = true;
    async function cargar() {
      const [usuarios, carreras, seminarios, cohortes, admisiones] = await Promise.allSettled([
        api.get<Usuario[]>("/autenticacion/usuarios", token),
        api.get<RegistroAdmin[]>("/carreras", token),
        api.get<RegistroAdmin[]>("/seminarios", token),
        api.get<Cohorte[]>("/cohortes", token),
        api.get<Record<string, number>>("/inscripcion/resumen-administrativo", token),
      ]);
      if (vigente && token) setResultado({ token, intento, datos: {
        usuarios: usuarios.status === "fulfilled" ? usuarios.value : null,
        carreras: carreras.status === "fulfilled" ? carreras.value : null,
        seminarios: seminarios.status === "fulfilled" ? seminarios.value : null,
        cohortes: cohortes.status === "fulfilled" ? cohortes.value : null,
        admisiones: admisiones.status === "fulfilled" ? admisiones.value : null,
      }});
    }
    void cargar();
    return () => { vigente = false; };
  }, [token, intento]);
  const actual = resultado?.token === token && resultado?.intento === intento ? resultado : null;
  const datos = actual?.datos ?? vacio;
  const cargando = Boolean(token) && !actual;
  const error = !cargando && Object.values(datos).some(v => v === null);
  return { datos, cargando, error, reintentar: () => setIntento(i => i + 1) };
}
