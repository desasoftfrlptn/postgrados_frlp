import { useState } from "react";
import { Search, SlidersHorizontal, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../Layout";

const estudiantes = [
  { nombre: "Pérez, Sofía", dni: "34.567.890", cohorte: "2023", carrera: "Maestría en Cs. Sociales", avance: 75, semaforo: "green", legajo: "Completo" },
  { nombre: "García, Laura", dni: "31.234.567", cohorte: "2023", carrera: "Maestría en Cs. Sociales", avance: 88, semaforo: "green", legajo: "Completo" },
  { nombre: "López, Martín", dni: "28.876.543", cohorte: "2023", carrera: "Maestría en Cs. Sociales", avance: 45, semaforo: "red", legajo: "Incompleto" },
  { nombre: "Ramírez, Tomás", dni: "33.117.222", cohorte: "2023", carrera: "Maestría en Cs. Sociales", avance: 18, semaforo: "red", legajo: "Incompleto" },
  { nombre: "Silva, Valentina", dni: "30.222.333", cohorte: "2024", carrera: "Doctorado en Educación", avance: 25, semaforo: "yellow", legajo: "En Revisión" },
];

const SEMAFORO: Record<string, string> = { green: "#22c55e", yellow: "#f59e0b", red: "#ef4444" };
const LEGAJO: Record<string, { color: string; icon: string }> = {
  Completo: { color: "#16a34a", icon: "✓" },
  Incompleto: { color: "#dc2626", icon: "⚠" },
  "En Revisión": { color: "#d97706", icon: "⏱" },
};

function ProgressBar({ value }: { value: number }) {
  const color = value >= 70 ? "#22c55e" : value >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "120px" }}>
      <div style={{ flex: 1, height: "6px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", backgroundColor: color, borderRadius: "4px" }} />
      </div>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", minWidth: "32px" }}>{value}%</span>
    </div>
  );
}

export function BuscadorEstudiantes() {
  const [query, setQuery] = useState("");

  const filtered = estudiantes.filter(
    (e) => e.nombre.toLowerCase().includes(query.toLowerCase()) || e.dni.includes(query)
  );

  return (
    <>
      <PageHeader title="7. BUSCADOR DE ESTUDIANTES" />
      <div style={{ padding: "24px" }}>
        {/* Search bar */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={15} color="#9ca3af" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o DNI..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", outline: "none", backgroundColor: "white", boxSizing: "border-box" }}
            />
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", backgroundColor: "white", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", cursor: "pointer", color: "#374151", fontWeight: 500 }}>
            <SlidersHorizontal size={14} /> Filtros
          </button>
        </div>

        {/* Table */}
        <div style={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["Estudiante", "DNI", "Cohorte", "Carrera", "% Avance", "Semáforo", "Estado Legajo", "Acciones"].map((col) => (
                  <th key={col} style={{ padding: "10px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const legajo = LEGAJO[e.legajo] ?? { color: "#374151", icon: "" };
                return (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                    onMouseEnter={(ev) => ((ev.currentTarget as HTMLElement).style.backgroundColor = "#f9fafb")}
                    onMouseLeave={(ev) => ((ev.currentTarget as HTMLElement).style.backgroundColor = "white")}
                  >
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, color: "#111" }}>{e.nombre}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#6b7280" }}>{e.dni}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#6b7280" }}>{e.cohorte}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#374151" }}>{e.carrera}</td>
                    <td style={{ padding: "12px 16px" }}><ProgressBar value={e.avance} /></td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: SEMAFORO[e.semaforo], margin: "0 auto" }} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: "13px", color: legajo.color, fontWeight: 500 }}>{legajo.icon} {e.legajo}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center" }}>
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #f3f4f6", backgroundColor: "#fafafa" }}>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>Mostrando 1 a {filtered.length} de {filtered.length} estudiantes</span>
            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <button style={{ padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: "4px", background: "white", cursor: "pointer", color: "#6b7280" }}><ChevronLeft size={14} /></button>
              {[1, 2, 3, 4, 5].map((p) => (
                <button key={p} style={{ padding: "4px 10px", border: "1px solid #e5e7eb", borderRadius: "4px", background: p === 1 ? "#0d2035" : "white", color: p === 1 ? "white" : "#374151", fontSize: "12px", cursor: "pointer", fontWeight: p === 1 ? 600 : 400 }}>{p}</button>
              ))}
              <button style={{ padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: "4px", background: "white", cursor: "pointer", color: "#6b7280" }}><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
