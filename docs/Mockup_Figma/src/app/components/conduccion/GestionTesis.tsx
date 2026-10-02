import { useState } from "react";
import { Plus, FileText, ChevronDown, ChevronUp, Save, X } from "lucide-react";
import { PageHeader } from "../Layout";

type TesisEstado = "En curso" | "Aprobada" | "Pendiente de aprobación";

interface TesisRecord {
  id: number;
  estudiante: string;
  carrera: string;
  titulo: string;
  director: string;
  codirector: string;
  resolucion: string;
  fechaAprobacion: string;
  estado: TesisEstado;
}

const initialData: TesisRecord[] = [
  { id: 1, estudiante: "Pérez, Sofía",     carrera: "Maestría en Ciencias Sociales", titulo: "Impacto de las políticas sociales en comunidades rurales del sur bonaerense", director: "Dra. Fernández, María",  codirector: "Dr. Ruiz, Carlos",    resolucion: "RES-2024-112", fechaAprobacion: "15/10/2024", estado: "Aprobada" },
  { id: 2, estudiante: "García, Laura",    carrera: "Maestría en Ciencias Sociales", titulo: "Representaciones sociales de la identidad de género en adolescentes urbanos", director: "Dr. Gómez, Luis",      codirector: "",                    resolucion: "",             fechaAprobacion: "",          estado: "En curso" },
  { id: 3, estudiante: "López, Martín",    carrera: "Maestría en Ciencias Sociales", titulo: "Análisis de redes comunitarias en procesos de desarrollo local", director: "Dra. Torres, Ana",     codirector: "Lic. Varela, Pedro",  resolucion: "RES-2025-008", fechaAprobacion: "",          estado: "Pendiente de aprobación" },
  { id: 4, estudiante: "Ramírez, Tomás",   carrera: "Doctorado en Educación",        titulo: "Modelos pedagógicos innovadores en entornos de educación a distancia", director: "Dr. Blanco, Ernesto",  codirector: "",                    resolucion: "",             fechaAprobacion: "",          estado: "En curso" },
  { id: 5, estudiante: "Silva, Valentina", carrera: "Doctorado en Educación",        titulo: "Inclusión educativa y trayectorias escolares de estudiantes con TEA", director: "Dra. Morales, Rita",   codirector: "Dra. Sosa, Beatriz",  resolucion: "RES-2025-031", fechaAprobacion: "",          estado: "Pendiente de aprobación" },
];

const ESTADO_STYLE: Record<TesisEstado, { color: string; bg: string }> = {
  "Aprobada":               { color: "#16a34a", bg: "#f0fdf4" },
  "En curso":               { color: "#d97706", bg: "#fefce8" },
  "Pendiente de aprobación":{ color: "#2563eb", bg: "#eff6ff" },
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px",
  border: "1px solid #d1d5db", borderRadius: "6px",
  fontSize: "13px", outline: "none",
  boxSizing: "border-box", backgroundColor: "white",
};

function EmptyForm({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      backgroundColor: "#f9fafb",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      padding: "20px 24px",
      marginBottom: "16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111", margin: 0 }}>Registrar nueva tesis / TFI</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "5px", color: "#374151" }}>Estudiante *</label>
          <select style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">Seleccionar estudiante...</option>
            {initialData.filter(d => d.titulo === "").map(d => (
              <option key={d.id}>{d.estudiante}</option>
            ))}
            <option>Martínez, Diego</option>
          </select>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "5px", color: "#374151" }}>Título de la tesis / TFI *</label>
          <input type="text" placeholder="Título completo del trabajo..." style={inputStyle} />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "5px", color: "#374151" }}>Director/a *</label>
          <input type="text" placeholder="Nombre y apellido del director/a" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "5px", color: "#374151" }}>Co-director/a (opcional)</label>
          <input type="text" placeholder="Nombre y apellido" style={inputStyle} />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "5px", color: "#374151" }}>N° de Resolución</label>
          <input type="text" placeholder="RES-2025-000" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "5px", color: "#374151" }}>Fecha de aprobación</label>
          <input type="date" style={inputStyle} />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "5px", color: "#374151" }}>Estado *</label>
          <select style={{ ...inputStyle, cursor: "pointer" }}>
            <option>En curso</option>
            <option>Pendiente de aprobación</option>
            <option>Aprobada</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
        <button onClick={onClose} style={{ padding: "8px 18px", backgroundColor: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", cursor: "pointer" }}>
          Cancelar
        </button>
        <button style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 18px", backgroundColor: "#0d2035", color: "white", border: "none", borderRadius: "6px", fontSize: "13px", cursor: "pointer", fontWeight: 500 }}>
          <Save size={13} /> Guardar registro
        </button>
      </div>
    </div>
  );
}

export function GestionTesis() {
  const [records] = useState<TesisRecord[]>(initialData);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState("Todos");

  const filtered = filtroEstado === "Todos" ? records : records.filter(r => r.estado === filtroEstado);

  return (
    <>
      <PageHeader title="GESTIÓN DE TESIS Y TFI — CPR" />
      <div style={{ padding: "20px 24px" }}>

        {/* Stats bar */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Total registradas", value: records.length, color: "#0d2035" },
            { label: "En curso", value: records.filter(r => r.estado === "En curso").length, color: "#d97706" },
            { label: "Pendiente aprobación", value: records.filter(r => r.estado === "Pendiente de aprobación").length, color: "#2563eb" },
            { label: "Aprobadas", value: records.filter(r => r.estado === "Aprobada").length, color: "#16a34a" },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>{s.label}</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* New form */}
        {showForm && <EmptyForm onClose={() => setShowForm(false)} />}

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {["Todos", "En curso", "Pendiente de aprobación", "Aprobada"].map(opt => (
              <button
                key={opt}
                onClick={() => setFiltroEstado(opt)}
                style={{
                  padding: "6px 14px",
                  backgroundColor: filtroEstado === opt ? "#0d2035" : "white",
                  color: filtroEstado === opt ? "white" : "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "20px",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: filtroEstado === opt ? 600 : 400,
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", backgroundColor: "#0d2035", color: "white", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
            >
              <Plus size={14} /> Registrar tesis
            </button>
          )}
        </div>

        {/* Records list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map(r => {
            const st = ESTADO_STYLE[r.estado];
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} style={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                {/* Row header */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 20px", cursor: "pointer" }}
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                >
                  <FileText size={18} color="#9ca3af" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#111", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.titulo}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                      {r.estudiante} · {r.carrera}
                    </div>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: st.color, backgroundColor: st.bg, padding: "3px 10px", borderRadius: "12px", flexShrink: 0 }}>
                    {r.estado}
                  </span>
                  {isOpen ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ padding: "0 20px 18px", borderTop: "1px solid #f3f4f6" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", paddingTop: "14px" }}>
                      {[
                        { label: "Director/a",      value: r.director || "—" },
                        { label: "Co-director/a",   value: r.codirector || "—" },
                        { label: "N° Resolución",   value: r.resolucion || "—" },
                        { label: "Fecha aprobación",value: r.fechaAprobacion || "Pendiente" },
                        { label: "Estado",          value: r.estado },
                      ].map(f => (
                        <div key={f.label}>
                          <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{f.label}</div>
                          <div style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>{f.value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                      <button style={{ padding: "6px 14px", backgroundColor: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "5px", fontSize: "12px", cursor: "pointer" }}>
                        Editar
                      </button>
                      {r.estado === "Pendiente de aprobación" && (
                        <button style={{ padding: "6px 14px", backgroundColor: "#2d7a65", color: "white", border: "none", borderRadius: "5px", fontSize: "12px", cursor: "pointer", fontWeight: 500 }}>
                          Aprobar resolución
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
