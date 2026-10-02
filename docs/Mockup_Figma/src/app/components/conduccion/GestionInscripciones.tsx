import { useState, Fragment } from "react";
import { Eye, CheckCircle2, XCircle, Clock, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react";
import { PageHeader } from "../Layout";

type LegajoEstado = "Completo" | "Incompleto" | "En revisión";

interface Aspirante {
  id: number;
  nombre: string;
  dni: string;
  carrera: string;
  cohorte: string;
  fechaInscripcion: string;
  legajo: LegajoEstado;
  documentosPendientes?: string[];
}

const aspirantes: Aspirante[] = [
  { id: 1, nombre: "Castro, Rocío",     dni: "38.421.903", carrera: "Maestría en Ciencias Sociales", cohorte: "2025", fechaInscripcion: "02/03/2025", legajo: "Completo" },
  { id: 2, nombre: "Herrera, Pablo",    dni: "36.120.455", carrera: "Maestría en Ciencias Sociales", cohorte: "2025", fechaInscripcion: "03/03/2025", legajo: "En revisión", documentosPendientes: ["Partida de nacimiento ilegible"] },
  { id: 3, nombre: "Díaz, Florencia",   dni: "39.876.112", carrera: "Doctorado en Educación",        cohorte: "2025", fechaInscripcion: "05/03/2025", legajo: "Incompleto", documentosPendientes: ["Foto carnet", "CV actualizado"] },
  { id: 4, nombre: "Moreno, Sebastián", dni: "35.009.874", carrera: "Doctorado en Educación",        cohorte: "2025", fechaInscripcion: "06/03/2025", legajo: "Completo" },
  { id: 5, nombre: "Suárez, Camila",    dni: "40.113.567", carrera: "Especialización en Gestión",    cohorte: "2025", fechaInscripcion: "08/03/2025", legajo: "Incompleto", documentosPendientes: ["Título universitario", "Certificado analítico"] },
  { id: 6, nombre: "Ríos, Andrés",      dni: "37.654.321", carrera: "Maestría en Ciencias Sociales", cohorte: "2024", fechaInscripcion: "01/08/2024", legajo: "Completo" },
  { id: 7, nombre: "Vega, Natalia",     dni: "33.201.890", carrera: "Especialización en Gestión",    cohorte: "2024", fechaInscripcion: "05/08/2024", legajo: "En revisión", documentosPendientes: ["DNI ilegible"] },
];

const LEGAJO_MAP: Record<LegajoEstado, { icon: React.ReactNode; color: string; bg: string }> = {
  "Completo":    { icon: <CheckCircle2 size={14} />, color: "#16a34a", bg: "#f0fdf4" },
  "Incompleto":  { icon: <XCircle size={14} />,      color: "#dc2626", bg: "#fef2f2" },
  "En revisión": { icon: <Clock size={14} />,         color: "#d97706", bg: "#fefce8" },
};

export function GestionInscripciones() {
  const [periodoAbierto, setPeriodoAbierto] = useState(true);
  const [filtroCarrera, setFiltroCarrera]   = useState("Todas");
  const [filtroCohorte, setFiltroCohorte]   = useState("Todas");
  const [filtroLegajo,  setFiltroLegajo]    = useState("Todos");
  const [detalle, setDetalle]               = useState<number | null>(null);

  const carreras = ["Todas", ...Array.from(new Set(aspirantes.map(a => a.carrera)))];
  const cohortes = ["Todas", ...Array.from(new Set(aspirantes.map(a => a.cohorte))).sort().reverse()];

  const filtered = aspirantes.filter(a => {
    if (filtroCarrera !== "Todas" && a.carrera !== filtroCarrera) return false;
    if (filtroCohorte !== "Todas" && a.cohorte !== filtroCohorte) return false;
    if (filtroLegajo  !== "Todos" && a.legajo  !== filtroLegajo)  return false;
    return true;
  });

  const stats = {
    total:      aspirantes.length,
    completos:  aspirantes.filter(a => a.legajo === "Completo").length,
    revision:   aspirantes.filter(a => a.legajo === "En revisión").length,
    incompletos:aspirantes.filter(a => a.legajo === "Incompleto").length,
  };

  return (
    <>
      <PageHeader title="GESTIÓN DE INSCRIPCIONES" />
      <div style={{ padding: "20px 24px" }}>

        {/* Period status banner */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            backgroundColor: periodoAbierto ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${periodoAbierto ? "#bbf7d0" : "#fecaca"}`,
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: periodoAbierto ? "#15803d" : "#dc2626", marginBottom: "2px" }}>
              Período de inscripción: {periodoAbierto ? "ABIERTO" : "CERRADO"}
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>
              {periodoAbierto
                ? "Los aspirantes pueden acceder al formulario de inscripción y cargar documentación."
                : "El formulario de inscripción está deshabilitado. Los aspirantes no pueden ingresar nuevos registros."}
            </div>
          </div>
          <button
            onClick={() => setPeriodoAbierto(p => !p)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              backgroundColor: periodoAbierto ? "#dc2626" : "#16a34a",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {periodoAbierto ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            {periodoAbierto ? "Cerrar inscripción" : "Abrir inscripción"}
          </button>
        </div>

        {/* KPI row */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Total aspirantes",  value: stats.total,       color: "#0d2035" },
            { label: "Legajo completo",   value: stats.completos,    color: "#16a34a" },
            { label: "En revisión",       value: stats.revision,     color: "#d97706" },
            { label: "Incompleto",        value: stats.incompletos,  color: "#dc2626" },
          ].map(k => (
            <div key={k.label} style={{ flex: 1, backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>{k.label}</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
          {[
            { label: "Carrera",        value: filtroCarrera, options: carreras,                                                          set: setFiltroCarrera },
            { label: "Cohorte",        value: filtroCohorte, options: cohortes,                                                          set: setFiltroCohorte },
            { label: "Estado legajo",  value: filtroLegajo,  options: ["Todos", "Completo", "En revisión", "Incompleto"],                 set: setFiltroLegajo  },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>{f.label}</div>
              <select
                value={f.value}
                onChange={e => f.set(e.target.value)}
                style={{ padding: "7px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", backgroundColor: "white", cursor: "pointer" }}
              >
                {f.options.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["Nombre y Apellido", "DNI", "Carrera", "Cohorte", "Fecha inscripción", "Estado legajo", "Acciones"].map(col => (
                  <th key={col} style={{ padding: "10px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const st = LEGAJO_MAP[a.legajo];
                const isDetail = detalle === a.id;
                return (
                  <Fragment key={a.id}>
                    <tr
                      style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: isDetail ? "#f9fafb" : "white" }}
                      onMouseEnter={ev => { if (!isDetail) (ev.currentTarget as HTMLElement).style.backgroundColor = "#f9fafb"; }}
                      onMouseLeave={ev => { if (!isDetail) (ev.currentTarget as HTMLElement).style.backgroundColor = "white"; }}
                    >
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, color: "#111" }}>{a.nombre}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#6b7280" }}>{a.dni}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#374151" }}>{a.carrera}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#6b7280" }}>{a.cohorte}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: "#6b7280" }}>{a.fechaInscripcion}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 600, color: st.color, backgroundColor: st.bg, padding: "3px 10px", borderRadius: "12px" }}>
                          {st.icon} {a.legajo}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={() => setDetalle(isDetail ? null : a.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center" }}
                          title="Ver legajo"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>

                    {/* Inline detail */}
                    {isDetail && (
                      <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td colSpan={7} style={{ padding: "0 16px 16px" }}>
                          <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "16px 20px" }}>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "10px" }}>
                              Legajo de {a.nombre}
                            </div>
                            {a.documentosPendientes && a.documentosPendientes.length > 0 && (
                              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", padding: "10px 14px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", marginBottom: "12px", fontSize: "13px", color: "#dc2626" }}>
                                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
                                <div>
                                  <strong>Documentos con observaciones:</strong>{" "}
                                  {a.documentosPendientes.join(", ")}
                                </div>
                              </div>
                            )}
                            <div style={{ display: "flex", gap: "8px" }}>
                              {a.legajo !== "Completo" && (
                                <button style={{ padding: "7px 14px", backgroundColor: "#0d2035", color: "white", border: "none", borderRadius: "5px", fontSize: "12px", cursor: "pointer", fontWeight: 500 }}>
                                  Enviar recordatorio al aspirante
                                </button>
                              )}
                              {a.legajo === "Completo" && (
                                <button style={{ padding: "7px 14px", backgroundColor: "#2d7a65", color: "white", border: "none", borderRadius: "5px", fontSize: "12px", cursor: "pointer", fontWeight: 500 }}>
                                  Aprobar e incorporar como estudiante
                                </button>
                              )}
                              <button
                                onClick={() => setDetalle(null)}
                                style={{ padding: "7px 14px", backgroundColor: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "5px", fontSize: "12px", cursor: "pointer" }}
                              >
                                Cerrar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", backgroundColor: "#fafafa", fontSize: "12px", color: "#6b7280" }}>
            Mostrando {filtered.length} de {aspirantes.length} aspirantes
          </div>
        </div>
      </div>
    </>
  );
}
