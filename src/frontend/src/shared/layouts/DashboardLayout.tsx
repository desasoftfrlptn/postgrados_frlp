import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function DashboardLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col">
        <h2 className="text-lg font-semibold text-gray-800">Posgrado</h2>
        <nav className="mt-4 space-y-1 flex-1">
          <Link to="/dashboard" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">
            Dashboard
          </Link>
          <Link to="/inscripcion" className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">
            Inscripcion
          </Link>
        </nav>
        <button onClick={handleLogout} className="block px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 text-left cursor-pointer">
          Cerrar sesion
        </button>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
