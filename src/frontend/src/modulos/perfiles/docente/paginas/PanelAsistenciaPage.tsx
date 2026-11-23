import { useState } from "react";

import FormularioAsistencia from "../componentes/FormularioAsistencia";
import HistorialAsistencias from "../componentes/HistorialAsistencias";

type VistaAsistencia =
  | "carga"
  | "historial";

export default function PanelAsistenciaPage() {
  const [vista, setVista] =
    useState<VistaAsistencia>("carga");

  return (
    <section className="perfil-pagina">
      <header className="perfil-pagina-encabezado">
        <h1>Panel de Asistencias</h1>

        <p>
          Registrá nuevas asistencias o consultá las ya cargadas.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          type="button"
          onClick={() =>
            setVista("carga")
          }
          className={
            vista === "carga"
              ? "bg-slate-800 text-white px-4 py-2 rounded-md font-semibold"
              : "bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-semibold hover:bg-gray-50"
          }
        >
          Registrar asistencia
        </button>

        <button
          type="button"
          onClick={() =>
            setVista("historial")
          }
          className={
            vista === "historial"
              ? "bg-slate-800 text-white px-4 py-2 rounded-md font-semibold"
              : "bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-semibold hover:bg-gray-50"
          }
        >
          Ver asistencias cargadas
        </button>
      </div>

      {vista === "carga" ? (
        <FormularioAsistencia />
      ) : (
        <HistorialAsistencias />
      )}
    </section>
  );
}