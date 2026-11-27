// Página responsable de mostrar al docente los seminarios que tiene asignados en el ciclo lectivo actual.
import "../../shared/estilos/PerfilesCompartidos.css";
import "../estilos/Docente.css";
import { useEffect, useState } from "react";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";
import { Link } from "react-router-dom";



interface SeminarioDocente {
  id: string;
  nombre: string;
  carrera_id: string;
  carrera_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

export default function MisSeminariosPage() {
    const { user } = useAuth();
    const [seminarios, setSeminarios] = useState<SeminarioDocente[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      async function cargarSeminarios() {
    if (!user?.token) {
      setCargando(false);
      return;
    }
    try {
      const respuesta = await api.get<SeminarioDocente[]>(
        "/seminarios/mis-seminarios",
        user.token
      );
      setSeminarios(respuesta);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los seminarios."
      );
    } finally {
      setCargando(false);
    }
  }
    cargarSeminarios();
}, [user?.token]);

    return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Mis Seminarios</h1>
        <p>Consultá tus seminarios asignados y gestioná su cursada. El alta, la modificación y la baja de seminarios corresponden a Administración.</p>
      </header>

   {cargando && (
     <p role="status" className="mt-6 text-slate-600 font-medium">
       Cargando tus seminarios asignados...
     </p>
   )}

   {error && (
     <p
       role="alert"
       className="mt-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm"
     >
       {error}
     </p>
   )}

   {!cargando && !error && seminarios.length === 0 && (
     <p role="status" className="mt-6 p-6 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-center">
       Todavía no tenés seminarios activos asignados en este ciclo lectivo.
     </p>
   )}

      {/* Uso de CSS Grid para distribuir las tarjetas de forma responsiva */}
      <ul className="docente-seminarios">
        {seminarios.map((seminario) => (
          <li key={seminario.id}>

            {/* Artículo semántico para cada seminario (tarjeta) */}
            <article className="perfil-panel docente-seminario">

              <header className="docente-seminario-cabecera">
                <div className="flex justify-end items-start mb-2">
                  <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded">
                    {seminario.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-blue-900 leading-tight">
                  {seminario.nombre}
                </h2>
                <p className="text-sm font-medium text-blue-700 mt-1">
                  {seminario.carrera_nombre}
                </p>
              </header>

              {/* Contenido flexible que empuja el footer hacia abajo */}
              <div className="p-5 flex-grow flex flex-col justify-between">

                {/* Lista de definición para las fechas */}
                <dl className="mb-6">
                  <div className="flex flex-col mb-3">
                    <dt className="text-xs font-bold text-slate-500 uppercase">Período de dictado</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-1">
                      Desde <time dateTime={seminario.fecha_inicio}>{seminario.fecha_inicio.split("-").reverse().join("/")}</time>
                      {" "}hasta <time dateTime={seminario.fecha_fin}>{seminario.fecha_fin.split("-").reverse().join("/")}</time>
                    </dd>
                  </div>
                </dl>

                {/* Footer semántico con las acciones (Navegación con React Router) */}
                <footer className="docente-seminario-acciones">
                  <Link to={`/dashboard/docente/estudiantes?seminario=${encodeURIComponent(seminario.id)}`} className="docente-boton docente-boton-secundario">Gestionar estudiantes</Link>
                  <Link
                    to="/dashboard/docente/asistencia"
                    className="text-center py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors text-sm"
                  >
                    Pasar Asistencia
                  </Link>
                  <Link
                    to="/dashboard/docente/calificaciones"
                    className="text-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-sm"
                  >
                    Cargar Notas
                  </Link>
                </footer>

              </div>
            </article>

          </li>
        ))}
      </ul>
    </section>
  );
}
