import { Outlet, Navigate, useNavigate } from "react-router";
import { BookOpen, Bell, DollarSign, ClipboardList } from "lucide-react";
import { Layout } from "./Layout";
import { useAuth } from "../context/AuthContext";

export function DocentePortal() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  if (role !== "docente") return <Navigate to="/" replace />;

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const navItems = [
    { icon: <BookOpen size={15} />,      label: "Mis Cursos",          to: "/docente/cursos",          group: "Gestión Académica" },
    { icon: <ClipboardList size={15} />, label: "Planilla de Carga",   to: "/docente/planilla",         group: "Gestión Académica" },
    { icon: <Bell size={15} />,          label: "Notificaciones",       to: "/docente/notificaciones",   group: "Gestión Académica" },
    { icon: <DollarSign size={15} />,    label: "Recibos de Sueldo",    to: "/docente/recibos",          group: "RRHH" },
  ];

  return (
    <Layout portalTitle="Portal Docente" navItems={navItems} onLogout={handleLogout}>
      <Outlet />
    </Layout>
  );
}
