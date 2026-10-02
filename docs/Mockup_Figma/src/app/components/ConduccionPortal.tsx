import { Outlet, Navigate, useNavigate } from "react-router";
import {
  LayoutDashboard,
  ClipboardList,
  Search,
  BarChart3,
  FileText,
  Bell,
  Settings,
} from "lucide-react";
import { Layout } from "./Layout";
import { useAuth } from "../context/AuthContext";

export function ConduccionPortal() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  if (role !== "conduccion") return <Navigate to="/" replace />;

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const navItems = [
    { icon: <LayoutDashboard size={15} />, label: "Dashboard", to: "/conduccion/dashboard" },
    { icon: <ClipboardList size={15} />, label: "Gestión de Inscripciones", to: "/conduccion/inscripciones" },
    { icon: <Search size={15} />, label: "Buscador de Estudiantes", to: "/conduccion/buscador" },
    { icon: <BarChart3 size={15} />, label: "Reportes y Exportación", to: "/conduccion/reportes" },
    { icon: <FileText size={15} />, label: "Gestión de Tesis", to: "/conduccion/tesis" },
    { icon: <Bell size={15} />, label: "Alertas y Vencimientos", to: "/conduccion/alertas" },
    { icon: <Settings size={15} />, label: "Configuración", to: "/conduccion/configuracion" },
  ];

  return (
    <Layout portalTitle="Portal Conducción" navItems={navItems} onLogout={handleLogout}>
      <Outlet />
    </Layout>
  );
}
