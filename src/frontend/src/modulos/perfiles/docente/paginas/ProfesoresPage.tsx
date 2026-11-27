// Página responsable de mostrar el directorio de docentes activos del posgrado.

import { useEffect, useState } from "react";
import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";

interface ColegaDocente {
  id: string;
  nombre: string;
  apellido: string;
  correo_electronico: string;
  seminarios: string[];
}

export default function ProfesoresPage() {
  const { user } = useAuth();
  const [profesores, setProfesores] = useState<ColegaDocente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargarColegas() {
      if (!user?.token) {
        setCargando(false);
        return;
      }
      setCargando(true);
      try {
        const lista = await api.get<ColegaDocente[]>(
          "/seminarios/colegas",
          user.token
        );
        setProfesores(lista);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el directorio de colegas."
        );
      } finally {
        setCargando(false);
      }
    }
    cargarColegas();
  }, [user?.token]);

  return (
    <section className="perfil-pagina animate-fade-in">
      <header className="perfil-pagina-encabezado">
        <h1>Directorio de Profesores</h1>
        <p>Consultá el cuerpo docente activo de las carreras y comunicate con tus colegas.</p>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm"
        >
          {error}
        </p>
      )}

      {cargando && (
        <p role="status" className="mt-6 text-sm text-slate-500">
          Cargando directorio docente...
        </p>
      )}

      {!cargando && profesores.length === 0 && !error && (
        <p className="mt-6 text-sm text-slate-500">
          No hay docentes activos registrados actualmente.
        </p>
      )}

      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {profesores.map((profe) => (
          <li key={profe.id}>
            <article className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
              <header className="bg-slate-50 border-b border-slate-200 p-5 flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg"
                  aria-hidden="true"
                >
                  {profe.nombre.charAt(0)}
                  {profe.apellido.charAt(0)}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-800 leading-tight">
                    {profe.apellido}, {profe.nombre}
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    Docente de Posgrado
                  </p>
                </div>
              </header>

              <div className="p-5 flex-grow flex flex-col justify-between gap-4">
                <dl>
                  <dt className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Seminarios a cargo
                  </dt>
                  <dd className="text-sm font-medium text-slate-800 mt-1">
                    {profe.seminarios.length > 0
                      ? profe.seminarios.join(" · ")
                      : "Sin seminarios asignados"}
                  </dd>
                </dl>

                <footer className="mt-auto border-t border-slate-100 pt-4">
                  <a
                    href={`mailto:${profe.correo_electronico}`}
                    className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
                    aria-label={`Enviar correo electrónico a ${profe.nombre} ${profe.apellido}`}
                  >
                    <span aria-hidden="true">✉️</span> Contactar ({profe.correo_electronico})
                  </a>
                </footer>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}