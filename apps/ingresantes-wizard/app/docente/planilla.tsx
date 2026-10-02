import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { scheduleTestNotification } from "../src/lib/notifications";
import { Marco } from './components/navLeft.tsx'; 

const FECHAS = ["12/03", "19/03", "26/03", "02/04", "09/04", "16/04"];

type EstudianteRow = {
  id: number;
  nombre: string;
  dni: string;
  asistencias: boolean[];
  calificacion: string;
};

const initialEstudiantes: EstudianteRow[] = [
  { id: 1, nombre: "Pérez, Sofía",     dni: "34.567.890", asistencias: [true,  true,  true,  true,  false, true ], calificacion: "9"  },
  { id: 2, nombre: "García, Laura",    dni: "31.234.567", asistencias: [true,  true,  false, true,  true,  true ], calificacion: "8"  },
  { id: 3, nombre: "López, Martín",    dni: "28.876.543", asistencias: [true,  false, true,  false, true,  false], calificacion: ""   },
  { id: 4, nombre: "Ramírez, Tomás",   dni: "33.117.222", asistencias: [false, true,  false, false, true,  false], calificacion: "4"  },
  { id: 5, nombre: "Silva, Valentina", dni: "30.222.333", asistencias: [true,  true,  true,  true,  true,  true ], calificacion: ""   },
  { id: 6, nombre: "Martínez, Diego",  dni: "27.543.210", asistencias: [true,  false, false, true,  false, true ], calificacion: "7"  },
];

function calcPct(asistencias: boolean[]) {
  return Math.round((asistencias.filter(Boolean).length / asistencias.length) * 100);
}

function autoEstado(pct: number, cal: string): { label: string; color: string } {
  if (pct < 75)         return { label: "Libre",     color: "#ef4444" };
  if (cal === "")       return { label: "Cursando",  color: "#f59e0b" };
  if (Number(cal) >= 6) return { label: "Aprobado",  color: "#22c55e" };
  return                       { label: "Reprobado", color: "#ef4444" };
}

export default function PlanillaDocente() {
  const [rows, setRows]         = useState<EstudianteRow[]>(initialEstudiantes);
  const [saved, setSaved]       = useState(false);

  const toggleAsistencia = (rowId: number, fechaIdx: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, asistencias: r.asistencias.map((v, i) => (i === fechaIdx ? !v : v)) }
          : r
      )
    );
    setSaved(false);
  };

  const setCalificacion = (rowId: number, val: string) => {
    const n = val.replace(/[^0-9]/g, "");
    if (n !== "" && (Number(n) < 1 || Number(n) > 10)) return;
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, calificacion: n } : r)));
    setSaved(false);
  };

  const handleGuardar = () => setSaved(true);

  return (
    <Marco>
      <div style={{ padding: "20px 24px" }}>

        {/* Seminar info bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "14px 20px",
            marginBottom: "20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", gap: "32px" }}>
            {[
              { label: "Cohorte", value: "2024" },
              { label: "Período", value: "1° Cuatr. 2025" },
              { label: "Estudiantes", value: `${rows.length}` },
              { label: "Clases registradas", value: `${FECHAS.length}` },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "2px" }}>{item.label}</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#111" }}>{item.value}</div>
              </div>
            ))}
          </div>
          <Link
            href="/docente/misCursos"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              color: "#6b7280",
              textDecoration: "none",
            }}
          >
		  {"<"} Volver a mis cursos
          </Link>
        </div>

        {/* Table */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            overflow: "auto",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "860px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>
                  Estudiante
                </th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#6b7280" }}>
                  DNI
                </th>

                {/* One column per class date */}
                {FECHAS.map((f) => (
                  <th
                    key={f}
                    style={{
                      padding: "10px 8px",
                      textAlign: "center",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#6b7280",
                      whiteSpace: "nowrap",
                      borderLeft: "1px solid #f3f4f6",
                    }}
                  >
                    {f}
                  </th>
                ))}

                <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#6b7280", borderLeft: "2px solid #e5e7eb", whiteSpace: "nowrap" }}>
                  % Asist.
                </th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>
                  Calificación
                </th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>
                  Estado (Auto)
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const pct = calcPct(row.asistencias);
                const estado = autoEstado(pct, row.calificacion);
                return (
                  <tr
                    key={row.id}
                    style={{ borderBottom: i < rows.length - 1 ? "1px solid #f3f4f6" : "none" }}
                  >
                    <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, color: "#111", whiteSpace: "nowrap" }}>
                      {row.nombre}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: "#6b7280" }}>
                      {row.dni}
                    </td>

                    {/* Asistencia checkboxes */}
                    {row.asistencias.map((present, fi) => (
                      <td key={fi} style={{ padding: "12px 8px", textAlign: "center", borderLeft: "1px solid #f3f4f6" }}>
                        <input
                          type="checkbox"
                          checked={present}
                          onChange={() => toggleAsistencia(row.id, fi)}
                          style={{ width: "16px", height: "16px", accentColor: "#2d7a65", cursor: "pointer" }}
                        />
                      </td>
                    ))}

                    {/* Attendance % */}
                    <td style={{ padding: "12px 12px", textAlign: "center", borderLeft: "2px solid #e5e7eb" }}>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: pct >= 75 ? "#16a34a" : "#ef4444",
                        }}
                      >
                        {pct}%
                      </span>
                    </td>

                    {/* Calificación input */}
                    <td style={{ padding: "10px 16px", textAlign: "center" }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row.calificacion}
                        onChange={(e) => setCalificacion(row.id, e.target.value)}
                        placeholder="—"
                        style={{
                          width: "52px",
                          padding: "6px 8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "5px",
                          fontSize: "13px",
                          textAlign: "center",
                          outline: "none",
                        }}
                      />
                    </td>

                    {/* Estado automático */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: estado.color,
                          backgroundColor: `${estado.color}18`,
                          padding: "3px 10px",
                          borderRadius: "12px",
                        }}
                      >
                        {estado.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "20px",
          }}
        >
          <div style={{ fontSize: "13px", color: "#6b7280" }}>
            {saved && (
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#16a34a" }}>
                <CheckCircle2 size={15} /> Cambios guardados correctamente
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleGuardar}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 20px",
                backgroundColor: "white",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              💾 Guardar borrador
            </button>
            <button
              onClick={handleGuardar}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 20px",
                backgroundColor: "#0d2035",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              🖅 Guardar y Enviar Actas
            </button>
          </div>
        </div>
      </div>
    </Marco>
  );
}