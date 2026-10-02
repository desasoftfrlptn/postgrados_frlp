import { Link } from "react-router";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { Inscripcion } from "./student/Inscripcion";

export function PublicInscripcion() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f2f3f5" }}>
      {/* Simple top bar */}
      <header
        style={{
          backgroundColor: "#1d6b59",
          height: "48px",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: "10px",
        }}
      >
        <GraduationCap size={18} color="white" />
        <span style={{ color: "white", fontSize: "14px", fontWeight: 500, flex: 1 }}>
          Sistema de Gestión de Posgrado
        </span>
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "white",
            textDecoration: "none",
            fontSize: "13px",
          }}
        >
          <ArrowLeft size={14} />
          Volver al inicio
        </Link>
      </header>

      {/* Page title bar */}
      <div
        style={{
          backgroundColor: "#2d7a65",
          padding: "14px 24px",
        }}
      >
        <h2 style={{ color: "white", fontSize: "15px", fontWeight: 600, margin: 0 }}>
          INSCRIPCIÓN DE ASPIRANTES
        </h2>
      </div>

      {/* Content */}
      <Inscripcion showHeader={false} />
    </div>
  );
}
