import { Link } from "react-router";
import { GraduationCap } from "lucide-react";

export function NotFound() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f2f3f5",
        gap: "16px",
      }}
    >
      <GraduationCap size={48} color="#9ca3af" />
      <div style={{ fontSize: "64px", fontWeight: 700, color: "#0d2035", lineHeight: 1 }}>404</div>
      <div style={{ fontSize: "18px", fontWeight: 600, color: "#374151" }}>
        Página no encontrada
      </div>
      <div style={{ fontSize: "14px", color: "#6b7280" }}>
        La página que buscás no existe o no tenés acceso.
      </div>
      <Link
        to="/"
        style={{
          marginTop: "8px",
          padding: "10px 24px",
          backgroundColor: "#0d2035",
          color: "white",
          borderRadius: "6px",
          textDecoration: "none",
          fontSize: "14px",
          fontWeight: 500,
        }}
      >
        Volver al inicio
      </Link>
    </div>
  );
}
