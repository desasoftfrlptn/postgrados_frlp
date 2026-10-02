import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { GraduationCap } from "lucide-react";
import { useAuth, type UserRole } from "../context/AuthContext";

const ROLE_REDIRECT: Record<UserRole, string> = {
  estudiante: "/estudiante/avance",
  docente: "/docente/cursos",
  conduccion: "/conduccion/dashboard",
};

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("estudiante");
  const { role, login } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to portal
  useEffect(() => {
    if (role) navigate(ROLE_REDIRECT[role], { replace: true });
  }, [role, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(selectedRole);
    navigate(ROLE_REDIRECT[selectedRole], { replace: true });
  };

  return (
    <div className="flex h-screen">
      {/* Left dark panel */}
      <div
        className="relative flex flex-col items-center justify-center overflow-hidden"
        style={{ width: "38%", backgroundColor: "#0d2035" }}
      >
        <div
          className="absolute"
          style={{
            top: "60px",
            right: "80px",
            width: "130px",
            height: "130px",
            border: "2px solid rgba(100,160,220,0.2)",
            transform: "rotate(45deg)",
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: "50px",
            left: "30px",
            width: "70px",
            height: "70px",
            border: "2px solid rgba(100,160,220,0.15)",
            transform: "rotate(45deg)",
          }}
        />

        <div
          className="flex items-center justify-center mb-6"
          style={{
            width: "80px",
            height: "80px",
            backgroundColor: "rgba(255,255,255,0.08)",
            borderRadius: "16px",
          }}
        >
          <GraduationCap size={40} color="white" />
        </div>

        <h1
          className="text-center px-10"
          style={{ color: "white", fontSize: "22px", fontWeight: 600, marginBottom: "12px" }}
        >
          Sistema de Gestión de Posgrado
        </h1>
        <p
          className="text-center px-12"
          style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", lineHeight: "1.6" }}
        >
          Gestión integral de inscripciones, seguimiento académico y estadísticas de posgrado.
        </p>
      </div>

      {/* Right white panel */}
      <div className="flex-1 flex items-center justify-center bg-white">
        <form onSubmit={handleSubmit} style={{ width: "420px" }}>
          <h2 style={{ fontSize: "26px", fontWeight: 600, marginBottom: "32px", color: "#111" }}>
            Iniciar sesión
          </h2>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "6px" }}>
              Email
            </label>
            <input
              type="email"
              placeholder="usuario@facultad.edu.ar"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "6px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "6px" }}>
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ textAlign: "right", marginBottom: "24px" }}>
            <a href="#" style={{ color: "#0d2035", fontSize: "13px" }}>
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "14px",
              backgroundColor: "#0d2035",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "24px",
            }}
          >
            Ingresar
          </button>

          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 500, marginBottom: "6px" }}>
              Selecciona tu rol
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                backgroundColor: "white",
                boxSizing: "border-box",
              }}
            >
              <option value="estudiante">Aspirante / Estudiante</option>
              <option value="docente">Docente</option>
              <option value="conduccion">Conducción / CPR / Administrador</option>
            </select>
          </div>

          <p style={{ textAlign: "center", marginTop: "28px", fontSize: "14px", color: "#666" }}>
            ¿No tenés cuenta?{" "}
            <Link to="/inscripcion" style={{ color: "#0d2035", fontWeight: 600 }}>
              Comenzar inscripción
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
