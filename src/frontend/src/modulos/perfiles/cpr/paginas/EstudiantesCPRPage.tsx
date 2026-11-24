import { useState } from "react";
import ConsultaCPR from "../componentes/ConsultaCPR";
import TrabajosPracticosCPR from "../componentes/TrabajosPracticosCPR";
import TutoriasGestionPage from "../../shared/paginas/TutoriasGestionPage";

export default function EstudiantesCPRPage() {
  const [vista, setVista] = useState<"estudiantes" | "trabajos" | "tutorias">("estudiantes");
  return <div className="perfil-pagina">
    <nav aria-label="Gestión académica de CPR" className="flex flex-wrap gap-2 mb-4">
      <button type="button" className="border rounded px-4 py-2 aria-pressed:bg-blue-600 aria-pressed:text-white" aria-pressed={vista === "estudiantes"} onClick={() => setVista("estudiantes")}>Estudiantes</button>
      <button type="button" className="border rounded px-4 py-2 aria-pressed:bg-blue-600 aria-pressed:text-white" aria-pressed={vista === "trabajos"} onClick={() => setVista("trabajos")}>Trabajos prácticos</button>
      <button type="button" className="border rounded px-4 py-2 aria-pressed:bg-blue-600 aria-pressed:text-white" aria-pressed={vista === "tutorias"} onClick={() => setVista("tutorias")}>Tutorías</button>
    </nav>
    {vista === "estudiantes" ? <ConsultaCPR modo="estudiantes"/> : vista === "trabajos" ? <TrabajosPracticosCPR/> : <TutoriasGestionPage/>}
  </div>;
}
