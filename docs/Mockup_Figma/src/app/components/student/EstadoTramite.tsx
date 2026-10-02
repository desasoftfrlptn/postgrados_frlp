import { CheckCircle2, XCircle, Clock, Upload, AlertTriangle } from "lucide-react";
import { PageHeader } from "../Layout";

type DocStatus = "cargado" | "pendiente" | "en_revision";

interface Documento {
  id: number;
  nombre: string;
  status: DocStatus;
  fecha?: string;
  nota?: string;
}

const documentos: Documento[] = [
  { id: 1, nombre: "DNI (frente y dorso)",                              status: "cargado",      fecha: "03/03/2025" },
  { id: 2, nombre: "Título universitario",                              status: "cargado",      fecha: "03/03/2025" },
  { id: 3, nombre: "Certificado analítico de materias aprobadas",       status: "cargado",      fecha: "05/03/2025" },
  { id: 4, nombre: "Partida de nacimiento",                             status: "en_revision",  fecha: "06/03/2025", nota: "Documento ilegible, por favor volvé a subir una copia más clara." },
  { id: 5, nombre: "Foto carnet (fondo blanco)",                        status: "pendiente" },
  { id: 6, nombre: "CV actualizado (PDF)",                              status: "pendiente" },
];

const cargados = documentos.filter((d) => d.status === "cargado").length;
const total = documentos.length;
const pct = Math.round((cargados / total) * 100);

const STATUS_MAP: Record<DocStatus, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  cargado:     { icon: <CheckCircle2 size={16} />, label: "Cargado",     color: "#16a34a", bg: "#f0fdf4" },
  pendiente:   { icon: <XCircle size={16} />,      label: "Pendiente",   color: "#dc2626", bg: "#fef2f2" },
  en_revision: { icon: <Clock size={16} />,         label: "En revisión", color: "#d97706", bg: "#fefce8" },
};

function CircleProgress({ pct }: { pct: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct === 100 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      <circle
        cx="65" cy="65" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "65px 65px", transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="65" y="60" textAnchor="middle" fontSize="22" fontWeight="700" fill="#111">{pct}%</text>
      <text x="65" y="78" textAnchor="middle" fontSize="11" fill="#6b7280">completado</text>
    </svg>
  );
}

export function EstadoTramite() {
  const estadoGlobal =
    pct === 100 ? { label: "Legajo Completo", color: "#16a34a", bg: "#f0fdf4" }
    : documentos.some((d) => d.status === "en_revision")
    ? { label: "En Revisión", color: "#d97706", bg: "#fefce8" }
    : { label: "Documentación Incompleta", color: "#dc2626", bg: "#fef2f2" };

  return (
    <>
      <PageHeader title="ESTADO DE TRÁMITE — LEGAJO DIGITAL" />
      <div style={{ padding: "24px", maxWidth: "800px" }}>

        {/* Summary card */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "32px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <CircleProgress pct={pct} />

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#111", marginBottom: "4px" }}>
              Sofía Pérez
            </div>
            <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: "1.8", marginBottom: "14px" }}>
              DNI: 34.567.890 · Cohorte: 2023<br />
              Carrera: Maestría en Ciencias Sociales
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "20px",
                backgroundColor: estadoGlobal.bg,
                color: estadoGlobal.color,
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {estadoGlobal.label}
            </div>
          </div>

          <div style={{ textAlign: "center", minWidth: "120px" }}>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>Documentos</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#111" }}>{cargados}<span style={{ fontSize: "16px", color: "#9ca3af" }}>/{total}</span></div>
            <div style={{ fontSize: "11px", color: "#9ca3af" }}>cargados</div>
          </div>
        </div>

        {/* Warning if in revision */}
        {documentos.some((d) => d.status === "en_revision") && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              padding: "12px 16px",
              backgroundColor: "#fefce8",
              border: "1px solid #fde68a",
              borderRadius: "6px",
              marginBottom: "16px",
              fontSize: "13px",
              color: "#92400e",
            }}
          >
            <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>
              Uno o más documentos requieren corrección. Revisá los detalles en la lista y volvé a subir los archivos indicados.
            </span>
          </div>
        )}

        {/* Documents list */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", fontSize: "14px", fontWeight: 600, color: "#111" }}>
            Documentos requeridos
          </div>

          {documentos.map((doc, i) => {
            const st = STATUS_MAP[doc.status];
            return (
              <div
                key={doc.id}
                style={{
                  padding: "14px 20px",
                  borderBottom: i < documentos.length - 1 ? "1px solid #f3f4f6" : "none",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                }}
              >
                {/* Status icon */}
                <div style={{ color: st.color, marginTop: "1px", flexShrink: 0 }}>{st.icon}</div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#111", marginBottom: "2px" }}>
                    {doc.nombre}
                  </div>
                  {doc.fecha && (
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      Cargado el {doc.fecha}
                    </div>
                  )}
                  {doc.nota && (
                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "12px",
                        color: "#d97706",
                        backgroundColor: "#fefce8",
                        padding: "6px 10px",
                        borderRadius: "4px",
                        border: "1px solid #fde68a",
                      }}
                    >
                      {doc.nota}
                    </div>
                  )}
                </div>

                {/* Badge + action */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: st.color,
                      backgroundColor: st.bg,
                      padding: "3px 10px",
                      borderRadius: "12px",
                    }}
                  >
                    {st.label}
                  </span>

                  {(doc.status === "pendiente" || doc.status === "en_revision") && (
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 12px",
                        backgroundColor: "#f3f4f6",
                        border: "1px solid #d1d5db",
                        borderRadius: "5px",
                        fontSize: "12px",
                        color: "#374151",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      <Upload size={12} />
                      {doc.status === "en_revision" ? "Volver a subir" : "Subir"}
                      <input type="file" accept=".pdf,image/*" style={{ display: "none" }} />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Help note */}
        <p style={{ marginTop: "16px", fontSize: "12px", color: "#9ca3af", lineHeight: "1.6" }}>
          Los documentos son revisados por el equipo de conducción. Una vez que tu legajo esté completo y aprobado,
          recibirás una notificación por correo electrónico confirmando tu admisión.
        </p>
      </div>
    </>
  );
}
