import { Outlet, Navigate, useNavigate } from "react-router";
import { BookOpen, FileText, ClipboardCheck } from "lucide-react";
import { Layout } from "./Layout";
import { useAuth } from "../context/AuthContext";

export function StudentPortal() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  if (role !== "estudiante") return <Navigate to="/" replace />;

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const navItems = [
    { icon: <BookOpen size={15} />,       label: "Mi Avance",         to: "/estudiante/avance" },
    { icon: <ClipboardCheck size={15} />, label: "Estado de Trámite", to: "/estudiante/tramite" },
    { icon: <FileText size={15} />,       label: "Inscripción",       to: "/estudiante/inscripcion" },
  ];

  return (
    <Layout portalTitle="Portal Estudiante" navItems={navItems} onLogout={handleLogout}>
      <Outlet />
    </Layout>
  );
}
