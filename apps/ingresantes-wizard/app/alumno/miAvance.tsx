import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { scheduleTestNotification } from "../src/lib/notifications";
import { Layout } from '../marco.tsx'; 

const TABS = ["Resumen", "Seminarios", "TFI / Tesis", "Documentación", "Alertas", "Historial"];

const seminarios = [
  { id: 1, nombre: "Seminario de Investigación I", asistencia: 95, calificacion: 9, fecha: "Mar 2024", estado: "Aprobado" },
  { id: 2, nombre: "Metodología de la Investigación", asistencia: 88, calificacion: 8, fecha: "Abr 2024", estado: "Aprobado" },
  { id: 3, nombre: "Seminario de Tesis", asistencia: 92, calificacion: null, fecha: "En curso", estado: "Cursando" },
  { id: 4, nombre: "Seminario de Análisis de Datos", asistencia: null, calificacion: null, fecha: null, estado: "Pendiente" },
  { id: 5, nombre: "Trabajo Final Integrador", asistencia: null, calificacion: null, fecha: null, estado: "No iniciado" },
];

function StatusIcon({ estado }: { estado: string }) {
  if (estado === "Aprobado") return <>🗹 </>;
  if (estado === "Cursando") return <>🕖</>;
  return <></>;
}

function StatusBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    Aprobado: "#16a34a",
    Cursando: "#d97706",
    Pendiente: "#9ca3af",
    "No iniciado": "#9ca3af",
  };
  return <span style={{ color: colors[estado] ?? "#374151", fontSize: "13px", fontWeight: 500 }}>{estado}</span>;
}


function Marco({children}) {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const navItems = [
    { icon: "🕮", label: "Mi Avance",          to: "/alumno/miAvance",       group: "Cursadas" },
    { icon: "📋", label: "Estado de trámite",  to: "/alumno/estadoDeTramite",  group: "Gestión" },
    { icon: "📋", label: "Inscripción",        to: "/alumno/inscripcion",      group: "Gestión" },
  ];

  return (
    <Layout portalTitle="Portal Docente" navItems={navItems} >
		{children}
	</Layout>
  );
}

export default function MiAvance() {
  const [activeTab, setActiveTab] = useState("Resumen");
  const progreso = 62;

  return (
    <Marco>
      <div style={{ padding: "24px", maxWidth: "1000px" }}>
        {/* Student card */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "20px 24px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "flex-start",
            gap: "20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" fill="#9ca3af" />
            </svg>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#111", marginBottom: "4px" }}>Sofía Pérez</div>
            <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: "1.7" }}>
              DNI: 34.567.890<br />
              Cohorte: 2023<br />
              Carrera: Maestría en Ciencias Sociales
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: "#f59e0b",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 6px",
              }}
            >
              <span style={{ color: "white", fontSize: "10px", fontWeight: 500 }}>Estado</span>
              <span style={{ color: "white", fontSize: "14px", fontWeight: 700 }}>Regular</span>
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "2px" }}>Estado del Legajo</div>
            <div style={{ fontSize: "12px", color: "#16a34a", fontWeight: 500 }}>✓ Completo</div>
          </div>

          <div style={{ textAlign: "right", minWidth: "120px" }}>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>% Avance de Carrera</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#111", marginBottom: "6px" }}>{progreso}%</div>
            <div style={{ width: "120px", height: "6px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${progreso}%`, height: "100%", backgroundColor: "#22c55e", borderRadius: "4px" }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ backgroundColor: "white", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", padding: "0 16px" }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "12px 16px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? "#0d2035" : "#6b7280",
                  borderBottom: activeTab === tab ? "2px solid #0d2035" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: "24px" }}>
            {activeTab === "Resumen" && (
              <>
                <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "16px", color: "#111" }}>Progreso Académico</h3>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {seminarios.map((s, i) => (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "14px 0",
                        borderBottom: i < seminarios.length - 1 ? "1px solid #f3f4f6" : "none",
                      }}
                    >
                      <StatusIcon estado={s.estado} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: 500, color: "#111", marginBottom: "3px" }}>{s.nombre}</div>
                        <div style={{ display: "flex", gap: "24px", fontSize: "12px", color: "#6b7280" }}>
                          <span>Asistencia: {s.asistencia !== null ? `${s.asistencia}%` : "-"}</span>
                          <span>Calificación: {s.calificacion !== null ? s.calificacion : "-"}</span>
                          <span>Fecha: {s.fecha ?? "-"}</span>
                        </div>
                      </div>
                      <StatusBadge estado={s.estado} />
                    </div>
                  ))}
                </div>

                <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "24px 0 12px", color: "#111" }}>Alertas</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", backgroundColor: "#fefce8", border: "1px solid #fde68a", borderRadius: "6px", fontSize: "13px", color: "#92400e" }}>
                    ⚠️
                    Vencimiento de Seminario: 30 días restantes
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", fontSize: "13px", color: "#1e40af" }}>
                    ℹ️
                    Plazo TFI: 180 días restantes
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                  <button style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", backgroundColor: "#0d2035", color: "white", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                    Descargar Certificado Analítico
                  </button>
                  <button style={{ padding: "10px 18px", backgroundColor: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                    Ver Historial Detallado
                  </button>
                </div>
              </>
            )}

            {activeTab === "Alertas" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", backgroundColor: "#fefce8", border: "1px solid #fde68a", borderRadius: "6px", fontSize: "13px", color: "#92400e" }}>
                  <AlertTriangle size={15} color="#d97706" /> Vencimiento de Seminario: 30 días restantes
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", fontSize: "13px", color: "#1e40af" }}>
                  <Info size={15} color="#3b82f6" /> Plazo TFI: 180 días restantes
                </div>
              </div>
            )}

            {!["Resumen", "Alertas"].includes(activeTab) && (
              <div style={{ color: "#6b7280", fontSize: "14px", textAlign: "center", padding: "40px 0" }}>
                <FileText size={36} color="#d1d5db" style={{ margin: "0 auto 12px", display: "block" }} />
                Sección disponible próximamente.
              </div>
            )}
          </div>
        </div>
      </div>
    </Marco>
  );
}