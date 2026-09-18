import { useState } from "react";
import { Sidebar } from "@/shared/components/Sidebar";
import { menuItems } from "@/shared/menuConfig";
import type { User } from "@/shared/types/types";
import ListaInscriptos from "../components/ListaInscriptos";

// User de ejemplo
const currentUser: User = {
  id: "u1",
  nombre: "Ana González",
  rol: "coordinador",
  email: "ana@ejemplo.com",
};

function Dashboard() {
  const [currentPath, setCurrentPath] = useState("/panel");

  return (
    <div className="flex h-screen w-full bg-paper text-ink">
      <Sidebar
        user={currentUser}
        items={menuItems}
        currentPath={currentPath}
        onNavigate={setCurrentPath}
      />
      <main className="scroll-fade flex-1 overflow-y-auto px-8 py-6 transition-colors">
        {currentPath === "/inscriptos" && <ListaInscriptos />}
      </main>
    </div>
  );
}

export default Dashboard;