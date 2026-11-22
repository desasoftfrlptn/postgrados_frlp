import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { alertasApi, type BandejaAlertas } from "../../../../shared/api/alertas";
import { ApiError } from "../../../../shared/api/client";
import { AlertasContext } from "../hooks/useAlertas";

function mensajeError(e: unknown, defecto: string): string {
  if (e instanceof ApiError) {
    if (e.status === 403) return "No tenés permiso para consultar estas notificaciones.";
    if (e.status === 401) return "Tu sesión venció. Volvé a iniciar sesión.";
    return `${defecto} (HTTP ${e.status}).`;
  }
  return e instanceof Error ? e.message : defecto;
}

export default function ProveedorAlertas({ token, children }: { token: string; children: ReactNode }) {
  const [datos, setDatos] = useState<BandejaAlertas | null>(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const bloqueo = useRef(false);
  const vigente = useRef(false);
  const refrescar = useCallback(async () => {
    if (!token || bloqueo.current) return;
    bloqueo.current = true;
    try { const respuesta = await alertasApi.listar(token); if (vigente.current) { setDatos(respuesta); setError(""); } }
    catch (e: unknown) { if (vigente.current) setError(mensajeError(e, "No se pudieron cargar las notificaciones.")); }
    finally { bloqueo.current = false; }
  }, [token]);
  useEffect(() => {
    vigente.current = true;
    const inicio = window.setTimeout(() => { void refrescar(); }, 0);
    const intervalo = window.setInterval(() => { if (!document.hidden) void refrescar(); }, 30000);
    return () => { vigente.current = false; window.clearTimeout(inicio); window.clearInterval(intervalo); };
  }, [refrescar]);
  async function leer(id?: string) {
    if (!token || bloqueo.current) return;
    bloqueo.current = true; setOcupado(true);
    try { await alertasApi.leer(token, id); const respuesta = await alertasApi.listar(token);
      if (vigente.current) { setDatos(respuesta); setError(""); } }
    catch (e: unknown) { if (vigente.current) setError(mensajeError(e, "No se pudo actualizar la bandeja.")); }
    finally { bloqueo.current = false; if (vigente.current) setOcupado(false); }
  }
  return <AlertasContext.Provider value={{ datos, error, ocupado, refrescar, leer }}>{children}</AlertasContext.Provider>;
}
