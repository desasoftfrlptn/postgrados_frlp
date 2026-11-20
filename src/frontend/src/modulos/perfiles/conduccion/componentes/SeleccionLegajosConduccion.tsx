import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";
import type { CarreraConduccion, CohorteConduccion, LegajoConduccion } from "../datos/conduccionDatos";
import "../estilos/ConduccionModulos.css";

// Este archivo comparte un hook y componentes de Conducción.
// eslint-disable-next-line react-refresh/only-export-components
export function useLegajosConduccion() {
  const { user } = useAuth();
  const token = user?.token;
  const [cohortes, setCohortes] = useState<CohorteConduccion[]>([]);
  const [carreras, setCarreras] = useState<CarreraConduccion[]>([]);
  const [cohorteId, setCohorteId] = useState("");
  const [legajos, setLegajos] = useState<LegajoConduccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoLegajos, setCargandoLegajos] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    const inicio = window.setTimeout(() => {
      if (!token) {
        if (activo) { setError("Necesitás iniciar sesión."); setCargando(false); }
        return;
      }
      void Promise.all([
        api.get<CohorteConduccion[]>("/cohortes", token),
        api.get<CarreraConduccion[]>("/carreras", token),
      ]).then(([cohortesRecibidas, carrerasRecibidas]) => {
        if (activo) { setCohortes(cohortesRecibidas); setCarreras(carrerasRecibidas); }
      }).catch((err: unknown) => {
        if (activo) setError(err instanceof Error ? err.message : "No se pudieron consultar las cohortes.");
      }).finally(() => { if (activo) setCargando(false); });
    }, 0);
    return () => { activo = false; window.clearTimeout(inicio); };
  }, [token]);

  useEffect(() => {
    let activo = true;
    const inicio = window.setTimeout(() => {
      if (!token || !cohorteId) { if (activo) { setLegajos([]); setCargandoLegajos(false); } return; }
      setCargandoLegajos(true);
      setError("");
      void api.get<LegajoConduccion[]>(`/inscripcion/?cohorte_id=${encodeURIComponent(cohorteId)}`, token)
        .then((respuesta) => { if (activo) setLegajos(respuesta); })
        .catch((err: unknown) => {
          if (activo) { setLegajos([]); setError(err instanceof Error ? err.message : "No se pudieron consultar los legajos."); }
        })
        .finally(() => { if (activo) setCargandoLegajos(false); });
    }, 0);
    return () => { activo = false; window.clearTimeout(inicio); };
  }, [cohorteId, token]);

  const cohorte = cohortes.find((item) => item.id === cohorteId);
  const carrera = carreras.find((item) => item.id === cohorte?.carrera_id);
  return { cohortes, carreras, cohorte, carrera, cohorteId, setCohorteId, legajos, cargando, cargandoLegajos, error };
}

export type DatosLegajos = ReturnType<typeof useLegajosConduccion>;

export function SelectorCohorteConduccion({ datos }: { datos: DatosLegajos }) {
  return (
    <div className="cc-filtro">
      <label htmlFor="cc-cohorte">Cohorte</label>
      <select id="cc-cohorte" value={datos.cohorteId} onChange={(e) => datos.setCohorteId(e.target.value)} disabled={datos.cargando}>
        <option value="">Seleccioná una cohorte</option>
        {datos.cohortes.map((cohorte) => {
          const carrera = datos.carreras.find((item) => item.id === cohorte.carrera_id);
          return <option value={cohorte.id} key={cohorte.id}>{cohorte.nombre} · {carrera?.nombre ?? "Sin carrera"}</option>;
        })}
      </select>
      {datos.cargando && <span role="status">Cargando cohortes…</span>}
      {datos.cargandoLegajos && <span role="status">Cargando legajos…</span>}
      {datos.error && <p role="alert" className="cc-error">{datos.error}</p>}
    </div>
  );
}

export function CabeceraConduccion({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return <header className="cc-cabecera"><h1>{titulo}</h1><p>{descripcion}</p></header>;
}

export function TablaLegajos({ legajos }: { legajos: LegajoConduccion[] }) {
  if (legajos.length === 0) return <p className="cc-vacio">No hay legajos para los filtros seleccionados.</p>;
  return <div className="cc-tabla-scroll"><table className="cc-tabla"><thead><tr><th>Apellido y nombre</th><th>DNI/Pasaporte</th><th>Carrera</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>
    {legajos.map((legajo) => <tr key={legajo.id}>
      <td>{legajo.apellido}, {legajo.nombre}</td><td>{legajo.dni_pasaporte}</td><td>{legajo.carrera_elegida}</td><td>{legajo.estado.replaceAll("_", " ")}</td>
      <td><Link to={`/dashboard/conduccion/legajos/${encodeURIComponent(legajo.id)}`}>Ver legajo</Link></td>
    </tr>)}
  </tbody></table></div>;
}

