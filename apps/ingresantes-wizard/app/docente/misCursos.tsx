import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { scheduleTestNotification } from "../src/lib/notifications";
import { Marco } from './components/navLeft.tsx'; 


const cursosActivos = [
  {
    id: 1,
    nombre: "Seminario de Investigación Cuantitativa",
    cohorte: "2024",
    cuatrimestre: "1° Cuatr. 2025",
    estudiantes: 18,
    estado: "Activo",
  },
];

const otrosCursos = [
  {
    id: 2,
    nombre: "Metodología de la Investigación",
    cohorte: "2024",
    cuatrimestre: "2° Cuatr. 2024",
    estudiantes: 22,
    estado: "Finalizado",
  },
  {
    id: 3,
    nombre: "Seminario de Tesis I",
    cohorte: "2023",
    cuatrimestre: "1° Cuatr. 2024",
    estudiantes: 15,
    estado: "Finalizado",
  },
  {
    id: 4,
    nombre: "Seminario de Investigación Cualitativa",
    cohorte: "2025",
    cuatrimestre: "2° Cuatr. 2025",
    estudiantes: null,
    estado: "Próximo",
  },
];

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    Activo: "#16a34a",
    Finalizado: "#6b7280",
    Próximo: "#2563eb",
  };
  return (
    <span style={{ color: map[estado] ?? "#374151", fontSize: "12px", fontWeight: 500 }}>
      {estado}
    </span>
  );
}

export default function MisCursosScreen() {
  const router = useRouter();
  return (
    <Marco>
      <div style={{ padding: "24px", maxWidth: "900px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>Cursos en curso</span>
        </div>

        {cursosActivos.map((curso) => (
          <div
            key={curso.id}
            style={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
				color: "#FFF",
				fontSize: "1.6em",
                backgroundColor: "#0d2035",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              🕮
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "15px", fontWeight: 600, color: "#111", marginBottom: "4px" }}>
                {curso.nombre}
              </div>
              <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#6b7280" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  📆 Cohorte {curso.cohorte} · {curso.cuatrimestre}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  👥 {curso.estudiantes} estudiantes
                </span>
                <EstadoBadge estado={curso.estado} />
              </div>
            </div>
            <button
              onClick={() => navigate("/docente/planilla")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "9px 18px",
                backgroundColor: "#0d2035",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Gestionar {">"}
            </button>
          </div>
        ))}

        <h3 style={{ fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "12px", marginTop: "8px" }}>
          Otros cursos
        </h3>
        <div
          style={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {otrosCursos.map((curso, i) => (
            <div
              key={curso.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "14px 20px",
                borderBottom: i < otrosCursos.length - 1 ? "1px solid #f3f4f6" : "none",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
				  fontSize: "1.2em",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                🕮
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "#111", marginBottom: "2px" }}>
                  {curso.nombre}
                </div>
                <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "#6b7280" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                    📆 Cohorte {curso.cohorte} · {curso.cuatrimestre}
                  </span>
                  {curso.estudiantes && (
                    <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                      👥 {curso.estudiantes} estudiantes
                    </span>
                  )}
                  <EstadoBadge estado={curso.estado} />
                </div>
              </div>
              {curso.estado === "Finalizado" && (
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "7px 14px",
                    backgroundColor: "white",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                    borderRadius: "5px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Ver actas {">"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Marco>
  );
}