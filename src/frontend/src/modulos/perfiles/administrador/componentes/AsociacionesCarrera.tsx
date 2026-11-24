import { useEffect, useState } from "react";
import ConfirmacionModal from "../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import { useConfirmacion } from "../../../../shared/hooks/useConfirmacion";
import { Link } from "react-router-dom";
import "../estilos/Administrador.css";
import { api } from "../../../../shared/api/client";

interface Datos {
  alumnos: { id: string; alumno: string; legajo: string; cohorte: string; estado: string; dni?: string; correo?: string }[];
  docentes: { id: string; docente: string; seminario: string; activo: boolean }[];
}

export default function AsociacionesCarrera({ carrera, token, volver }: {
  carrera: { id: string; nombre: string }; token: string; volver?: () => void;
}) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [opciones, setOpciones] = useState<{ alumnos: {id: string; nombre: string; dni: string; legajo: string | null}[]; cohortes: {id: string; nombre: string}[] } | null>(null);
  const [alumno, setAlumno] = useState("");
  const [cohorte, setCohorte] = useState("");
  const [mensaje, setMensaje] = useState("");
  const confirmacion = useConfirmacion();
  const base = `/carreras/${carrera.id}/asociaciones`;
  const normalizar = (dni: string) => dni.replace(/[.\s]/g, "").toUpperCase();
  const documentosAsociados = new Set(datos?.alumnos.map(a => normalizar(a.dni ?? "")) ?? []);
  const candidatos = opciones?.alumnos.filter(a => !documentosAsociados.has(normalizar(a.dni))) ?? [];
  async function abrir() {
    setError(""); setMensaje("");
    try { setOpciones(await api.get<NonNullable<typeof opciones>>(`${base}/candidatos`, token)); } catch(e) { setError(e instanceof Error ? e.message : "No se pudieron cargar los alumnos."); }
  }
  function cambiar(id?: string) {
    confirmacion.solicitar({ titulo: id ? "Desasociar alumno" : "Asociar alumno", descripcion: id ? "Se dará de baja la inscripción en esta carrera, conservando su legajo e historial académico." : "Se creará una inscripción académica para el alumno en la cohorte seleccionada.", peligroso: !!id, ejecutar: async () => {
      try { if (id) await api.delete(`${base}/alumnos/${id}`, token); else await api.post(`${base}/alumnos`, {legajo_id: alumno, cohorte_id: cohorte}, token);
        setOpciones(null); setAlumno(""); setCohorte(""); setError(""); setMensaje(id ? "Alumno desasociado." : "Alumno asociado."); setRevision(v => v + 1);
      } catch(e) { setError(e instanceof Error ? e.message : "No se pudo guardar la asociación."); }
    }});
  }
  useEffect(() => {
    let vigente = true;
    api.get<Datos>(`/carreras/${carrera.id}/asociaciones`, token).then(respuesta => {
      if (vigente) setDatos(respuesta);
    }).catch(e => { if (vigente) setError(e instanceof Error ? e.message : "No se pudieron cargar las asociaciones."); });
    return () => { vigente = false; };
  }, [carrera.id, token, revision]);
  const coincide = (...campos: string[]) => campos.join(" ").toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase());
  const alumnos = datos?.alumnos.filter(a => coincide(a.alumno, a.legajo, a.cohorte, a.estado, a.dni ?? "", a.correo ?? "")) ?? [];
  const docentes = datos?.docentes.filter(d => coincide(d.docente, d.seminario)) ?? [];
  return <section className="admin-asociaciones" aria-labelledby="titulo-asociaciones">
    <header className="admin-gestion-cabecera">
      <h2 id="titulo-asociaciones">Alumnos asociados</h2>
      {volver && <button type="button" className="admin-gestion-boton" onClick={volver}>Volver a carreras</button>}
      <button type="button" className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white" onClick={abrir}>+ Asociar alumno</button>
    </header>
    {mensaje && <p role="status">{mensaje}</p>}
    {opciones && <form className="admin-gestion-ficha" onSubmit={e => { e.preventDefault(); if (candidatos.some(a => a.id === alumno) && cohorte) cambiar(); }}><div className="admin-gestion-datos"><div><label htmlFor="asociar-alumno">Alumno</label><select id="asociar-alumno" required value={alumno} onChange={e => setAlumno(e.target.value)}><option value="">Seleccioná</option>{candidatos.map(a => <option key={a.id} value={a.id}>{a.nombre} · {a.dni} · {a.legajo ?? "Sin legajo"}</option>)}</select></div><div><label htmlFor="asociar-cohorte">Cohorte</label><select id="asociar-cohorte" required value={cohorte} onChange={e => setCohorte(e.target.value)}><option value="">Seleccioná</option>{opciones.cohortes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div></div><div className="admin-gestion-acciones"><button className="admin-gestion-boton" type="button" onClick={() => setOpciones(null)}>Cancelar</button><button className="admin-gestion-boton" type="submit" disabled={!candidatos.some(a => a.id === alumno) || !cohorte}>Guardar asociación</button></div></form>}
    <div className="admin-gestion-acciones">
      <Link className="admin-gestion-boton" to="/dashboard/administrador/cohortes">Gestionar cohortes</Link>
      <Link className="admin-gestion-boton" to={`/dashboard/administrador/seminarios?carrera=${encodeURIComponent(carrera.id)}`}>Gestionar seminarios y docentes</Link>
    </div>
    {error ? <div role="alert">{error} <button type="button" className="underline" onClick={() => { setError(""); setDatos(null); setRevision(v => v + 1); }}>Reintentar</button></div> : !datos ? <p role="status">Cargando asociaciones…</p> : <>
      <div className="admin-asociaciones-filtro"><label htmlFor="buscar-asociacion" className="block font-semibold">Buscar por nombre, legajo, cohorte o seminario</label>
      <input id="buscar-asociacion" type="search" className="border rounded-md p-2 w-full mb-5" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div>
      <section className="admin-gestion-ficha"><h2 className="text-lg font-bold mb-2">Alumnos y legajos ({alumnos.length})</h2>
      {alumnos.length === 0 ? <p>No se encontraron legajos.</p> : <div className="overflow-x-auto mb-6"><table className="admin-asociaciones-tabla"><thead><tr>{["Alumno", "DNI", "Correo", "Legajo", "Cohorte", "Estado", "Acciones"].map(t => <th scope="col" className="p-3" key={t}>{t}</th>)}</tr></thead><tbody>{alumnos.map(a => <tr key={a.id} className="border-t"><td className="p-3"><Link className="text-blue-600 underline" to={`/dashboard/administrador/usuarios/legajo/${a.id}`}>{a.alumno}</Link></td><td className="p-3">{a.dni ?? "—"}</td><td className="p-3">{a.correo ?? "—"}</td><td className="p-3">{a.legajo}</td><td className="p-3">{a.cohorte}</td><td className="p-3">{a.estado}</td><td className="p-3"><button type="button" className="admin-accion-eliminar" onClick={() => cambiar(a.id)}>Desasociar</button></td></tr>)}</tbody></table></div>}
      </section><section className="admin-gestion-ficha"><h2 className="text-lg font-bold mb-2">Docentes y seminarios ({docentes.length})</h2>
      {docentes.length === 0 ? <p>No se encontraron asignaciones.</p> : <div className="overflow-x-auto"><table className="admin-asociaciones-tabla"><thead><tr>{["Docente", "Seminario", "Estado"].map(t => <th scope="col" className="p-3" key={t}>{t}</th>)}</tr></thead><tbody>{docentes.map(d => <tr key={d.id} className="border-t"><td className="p-3">{d.docente}</td><td className="p-3">{d.seminario}</td><td className="p-3">{d.activo ? "Activa" : "Inactiva"}</td></tr>)}</tbody></table></div>}
    </section></>}
    <ConfirmacionModal abierto={confirmacion.abierto} titulo={confirmacion.titulo} descripcion={confirmacion.descripcion} peligroso={confirmacion.peligroso} confirmando={confirmacion.procesando} alConfirmar={confirmacion.confirmar} alCancelar={confirmacion.cancelar} />
  </section>;
}
