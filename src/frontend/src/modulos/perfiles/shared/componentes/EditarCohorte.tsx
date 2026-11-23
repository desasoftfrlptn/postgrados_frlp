import { useState, type FormEvent } from "react";
import { api } from "../../../../shared/api/client";
import ConfirmacionModal from "../../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import { useConfirmacion } from "../../../../shared/hooks/useConfirmacion";

export interface DatosCohorte {
  id: string;
  nombre: string;
  anio: number;
  carrera_id: string | null;
  fecha_inicio: string | null;
  abierta: boolean;
}

interface Props<T extends DatosCohorte> {
  cohorte: T;
  carreras: { id: string; nombre: string; activo: boolean }[];
  token: string;
  cancelar: () => void;
  guardada: (cohorte: T) => void;
}

export default function EditarCohorte<T extends DatosCohorte>({ cohorte, carreras, token, cancelar, guardada }: Props<T>) {
  const [nombre, setNombre] = useState(cohorte.nombre);
  const [anio, setAnio] = useState(String(cohorte.anio));
  const [carrera, setCarrera] = useState(cohorte.carrera_id ?? "");
  const [fecha, setFecha] = useState(cohorte.fecha_inicio ?? "");
  const [error, setError] = useState("");
  const confirmacion = useConfirmacion();
  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!nombre.trim() || !carrera || !Number.isInteger(Number(anio)) || Number(anio) < 1) {
      setError("Completá el nombre, año y carrera de la cohorte.");
      return;
    }
    setError("");
    confirmacion.solicitar({
      titulo: "Confirmar modificación de cohorte",
      descripcion: "¿Confirmás los cambios de la cohorte?",
      ejecutar: async () => {
        try {
          const resultado = await api.put<T>(`/cohortes/${cohorte.id}`, {
            nombre: nombre.trim(), anio: Number(anio), carrera_id: carrera, fecha_inicio: fecha || null,
            anterior: { nombre: cohorte.nombre, anio: cohorte.anio, carrera_id: cohorte.carrera_id, fecha_inicio: cohorte.fecha_inicio },
          }, token);
          guardada(resultado);
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudo guardar la cohorte.");
        }
      },
    });
  }
  const campo = "w-full rounded-md border border-gray-300 bg-white p-2";
  return <section className="perfil-pagina">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Editar cohorte</h1><p>Actualizá los datos de la cohorte.</p></div>
      <button type="button" disabled={confirmacion.abierto} onClick={cancelar} className="rounded-md border px-4 py-2">Volver al listado</button>
    </header>
    <form onSubmit={guardar} className="rounded-xl border border-gray-200 bg-white p-6" aria-busy={confirmacion.procesando}>
      <fieldset disabled={confirmacion.abierto} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div><label className="block font-semibold" htmlFor="editar-cohorte-nombre">Nombre *</label><input className={campo} id="editar-cohorte-nombre" value={nombre} required maxLength={50} onChange={e => setNombre(e.target.value)} /></div>
        <div><label className="block font-semibold" htmlFor="editar-cohorte-anio">Año *</label><input className={campo} id="editar-cohorte-anio" type="number" min={1} step={1} required value={anio} onChange={e => setAnio(e.target.value)} /></div>
        <div><label className="block font-semibold" htmlFor="editar-cohorte-carrera">Carrera *</label><select className={campo} id="editar-cohorte-carrera" required value={carrera} onChange={e => setCarrera(e.target.value)}><option value="">Seleccioná una carrera</option>{carreras.filter(c => c.activo || c.id === cohorte.carrera_id).map(c => <option key={c.id} value={c.id}>{c.nombre}{!c.activo ? " (inactiva)" : ""}</option>)}</select></div>
        <div><label className="block font-semibold" htmlFor="editar-cohorte-fecha">Fecha de inicio</label><input className={campo} id="editar-cohorte-fecha" type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></div>
      </fieldset>
      <p className="mt-4 text-sm text-gray-600">La carrera y el año no pueden cambiarse si existe historial académico. Para cerrar inscripciones utilizá la acción del listado.</p>
      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-red-800">{error}</p>}
      <footer className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" disabled={confirmacion.abierto} onClick={cancelar} className="rounded-md border px-4 py-2">Cancelar</button><button type="submit" disabled={confirmacion.abierto} className="rounded-md bg-blue-700 px-4 py-2 font-semibold text-white">Guardar cambios</button></footer>
    </form>
    <ConfirmacionModal abierto={confirmacion.abierto} titulo={confirmacion.titulo} descripcion={confirmacion.descripcion} textoConfirmar={confirmacion.textoConfirmar} confirmando={confirmacion.procesando} alConfirmar={confirmacion.confirmar} alCancelar={confirmacion.cancelar} />
  </section>;
}
