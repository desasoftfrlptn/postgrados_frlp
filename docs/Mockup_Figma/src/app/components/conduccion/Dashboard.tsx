import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Users, BookOpen, GraduationCap, TrendingDown, FileText, Download } from "lucide-react";
import { PageHeader } from "../Layout";

const lineData = [
  { year: "2019", inscriptos: 125 },
  { year: "2020", inscriptos: 138 },
  { year: "2021", inscriptos: 150 },
  { year: "2022", inscriptos: 158 },
  { year: "2023", inscriptos: 170 },
  { year: "2024", inscriptos: 186 },
];

const barData = [
  { cohorte: "2018", graduados: 32 },
  { cohorte: "2019", graduados: 35 },
  { cohorte: "2020", graduados: 37 },
  { cohorte: "2021", graduados: 45 },
  { cohorte: "2022", graduados: 44 },
  { cohorte: "2023", graduados: 46 },
];

const pieData = [
  { name: "En Proceso", value: 45, color: "#f59e0b" },
  { name: "Aprobados", value: 35, color: "#22c55e" },
  { name: "No Iniciados", value: 20, color: "#ef4444" },
];

const resumenCarreras = [
  { carrera: "Maestría en Ciencias Sociales", inscriptos: 98, cursando: 76, graduados: 68, desgranamiento: "22%", tesis: 28 },
  { carrera: "Doctorado en Educación", inscriptos: 56, cursando: 42, graduados: 24, desgranamiento: "25%", tesis: 19 },
  { carrera: "Especialización en Gestión", inscriptos: 32, cursando: 24, graduados: 12, desgranamiento: "38%", tesis: 9 },
];

function KpiCard({ label, value, sub, icon, dark }: {
  label: string; value: string | number; sub: string; icon: React.ReactNode; dark?: boolean;
}) {
  return (
    <div style={{
      flex: 1, padding: "16px 20px",
      backgroundColor: dark ? "#0d2035" : "white",
      borderRadius: "8px",
      border: dark ? "none" : "1px solid #e5e7eb",
      display: "flex", flexDirection: "column", gap: "4px", minWidth: "0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "12px", color: dark ? "rgba(255,255,255,0.6)" : "#6b7280" }}>{label}</span>
        <span style={{ color: dark ? "rgba(255,255,255,0.4)" : "#d1d5db" }}>{icon}</span>
      </div>
      <div style={{ fontSize: "26px", fontWeight: 700, color: dark ? "white" : "#111" }}>{value}</div>
      <div style={{ fontSize: "11px", color: dark ? "rgba(255,255,255,0.5)" : "#9ca3af" }}>{sub}</div>
    </div>
  );
}

const exportBtn = (
  <button style={{
    display: "flex", alignItems: "center", gap: "6px",
    padding: "7px 14px",
    backgroundColor: "rgba(255,255,255,0.15)", color: "white",
    border: "1px solid rgba(255,255,255,0.3)", borderRadius: "5px",
    fontSize: "12px", cursor: "pointer",
  }}>
    <Download size={13} /> Exportar
  </button>
);

export function Dashboard() {
  return (
    <>
      <PageHeader title="6. DASHBOARD ESTADÍSTICO (CONDUCCIÓN)" action={exportBtn} />
      <div style={{ padding: "20px 24px" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Carrera", options: ["Todas", "Maestría en Cs. Sociales", "Doctorado en Educación"] },
            { label: "Cohorte", options: ["Todas", "2023", "2024", "2025"] },
            { label: "Período", options: ["Último año", "Últimos 3 años", "Histórico"] },
          ].map((f) => (
            <div key={f.label}>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>{f.label}</div>
              <select style={{ padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", backgroundColor: "white", cursor: "pointer" }}>
                {f.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* KPIs */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
          <KpiCard label="Total Inscriptos" value={186} sub="+12% vs año anterior" icon={<Users size={16} />} />
          <KpiCard label="Cursando" value={142} sub="76% del total" icon={<BookOpen size={16} />} />
          <KpiCard label="Graduados" value={104} sub="+8% vs 2024" icon={<GraduationCap size={16} />} />
          <KpiCard label="Desgranamiento" value="28%" sub="-3% vs cohorte anterior" icon={<TrendingDown size={16} />} />
          <KpiCard label="Tesis en Desarrollo" value={56} sub="39% de cursantes" icon={<FileText size={16} />} dark />
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div style={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#111" }}>Evolución de Inscripciones</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 200]} />
                <Tooltip />
                <Line type="monotone" dataKey="inscriptos" stroke="#0d2035" strokeWidth={2} dot={{ r: 4, fill: "#0d2035" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#111" }}>Situación de Trabajos Finales</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                    {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: "#374151" }}>{d.name} {d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <div style={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "20px", marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#111" }}>Graduaciones por Cohorte</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="cohorte" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 60]} />
              <Tooltip />
              <Bar dataKey="graduados" fill="#0d2035" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary table */}
        <div style={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>Resumen por Carrera</h3>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f9fafb" }}>
                {["Carrera", "Inscriptos", "Cursando", "Graduados", "Desgran.", "Tesis en Des."].map((col) => (
                  <th key={col} style={{ padding: "10px 20px", textAlign: col === "Carrera" ? "left" : "center", fontSize: "12px", fontWeight: 600, color: "#6b7280" }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resumenCarreras.map((row, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 20px", fontSize: "13px", color: "#374151" }}>{row.carrera}</td>
                  <td style={{ padding: "12px 20px", textAlign: "center", fontSize: "13px", color: "#374151" }}>{row.inscriptos}</td>
                  <td style={{ padding: "12px 20px", textAlign: "center", fontSize: "13px", color: "#374151" }}>{row.cursando}</td>
                  <td style={{ padding: "12px 20px", textAlign: "center", fontSize: "13px", color: "#374151" }}>{row.graduados}</td>
                  <td style={{ padding: "12px 20px", textAlign: "center", fontSize: "13px", color: "#374151" }}>{row.desgranamiento}</td>
                  <td style={{ padding: "12px 20px", textAlign: "center", fontSize: "13px", color: "#374151" }}>{row.tesis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
