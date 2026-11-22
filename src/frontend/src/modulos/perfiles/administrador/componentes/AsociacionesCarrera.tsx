import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../../shared/api/client";

interface Datos {
  alumnos: { id: string; alumno: string; legajo: string; cohorte: string; estado: string }[];
  docentes: { id: string; docente: string; seminario: string; activo: boolean }[];
}

export default function AsociacionesCarrera({ carrera, token, volver }: {
  carrera: { id: string; nombre: string }; token: string; volver: () => void;
}) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  useEffect(() => {
    let vigente = true;
    api.get<Datos>(`/carreras/${carrera.id}/asociaciones`, token).then(respuesta => {
      if (vigente) setDatos(respuesta);
    }).catch(e => { if (vigente) setError(e instanceof Error ? e.message : "No se pudieron cargar las asociaciones."); });
    return () => { vigente = false; };
  }, [carrera.id, token, revision]);
  const coincide = (...campos: string[]) => campos.join(" ").toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase());
  const alumnos = datos?.alumnos.filter(a => coincide(a.alumno, a.legajo, a.cohorte, a.estado)) ?? [];
  const docentes = datos?.docentes.filter(d => coincide(d.docente, d.seminario)) ?? [];
  return <section className="perfil-pagina" aria-labelledby="titulo-asociaciones">
    <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div><h1 id="titulo-asociaciones" className="text-2xl font-bold">Asociaciones académicas</h1><p>{carrera.nombre}</p></div>
      <button type="button" className="rounded-md border px-4 py-2" onClick={volver}>Volver a carreras</button>
    </header>
    <p className="mb-4">Los alumnos se vinculan mediante su legajo y los docentes mediante los seminarios asignados.</p>
    <div className="flex flex-wrap gap-3 mb-5">
      <Link className="rounded-md bg-blue-600 text-white px-4 py-2" to="/dashboard/administrador/cohortes">Gestionar cohortes</Link>
      <Link className="rounded-md bg-blue-600 text-white px-4 py-2" to={`/dashboard/administrador/seminarios?carrera=${encodeURIComponent(carrera.id)}`}>Gestionar seminarios y docentes</Link>
    </div>
    {error ? <div role="alert">{error} <button type="button" className="underline" onClick={() => { setError(""); setDatos(null); setRevision(v => v + 1); }}>Reintentar</button></div> : !datos ? <p role="status">Cargando asociaciones…</p> : <>
      <label htmlFor="buscar-asociacion" className="block font-semibold">Buscar por nombre, legajo, cohorte o seminario</label>
      <input id="buscar-asociacion" type="search" className="border rounded-md p-2 w-full mb-5" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      <h2 className="text-lg font-bold mb-2">Alumnos y legajos ({alumnos.length})</h2>
      {alumnos.length === 0 ? <p>No se encontraron legajos.</p> : <div className="overflow-x-auto mb-6"><table className="w-full text-left"><thead><tr>{["Alumno", "Legajo", "Cohorte", "Estado"].map(t => <th scope="col" className="p-3" key={t}>{t}</th>)}</tr></thead><tbody>{alumnos.map(a => <tr key={a.id} className="border-t"><td className="p-3">{a.alumno}</td><td className="p-3">{a.legajo}</td><td className="p-3">{a.cohorte}</td><td className="p-3">{a.estado}</td></tr>)}</tbody></table></div>}
      <h2 className="text-lg font-bold mt-5 mb-2">Docentes y seminarios ({docentes.length})</h2>
      {docentes.length === 0 ? <p>No se encontraron asignaciones.</p> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{["Docente", "Seminario", "Estado"].map(t => <th scope="col" className="p-3" key={t}>{t}</th>)}</tr></thead><tbody>{docentes.map(d => <tr key={d.id} className="border-t"><td className="p-3">{d.docente}</td><td className="p-3">{d.seminario}</td><td className="p-3">{d.activo ? "Activa" : "Inactiva"}</td></tr>)}</tbody></table></div>}
    </>}
  </section>;
}
