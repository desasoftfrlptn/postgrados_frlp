// Layout compartido por las páginas públicas de la aplicación.

import { Outlet } from "react-router-dom";
import BarraNavHome from "../componentes/BarraNavHome/BarraNavHome";
import PiePagina from "../componentes/PiePagina/PiePagina";
import "./PublicLayout.css";

export default function PublicLayout() {
  return (
    <div className="layout-publico">
      <BarraNavHome />

      <main className="layout-publico-contenido">
        <Outlet />
      </main>

      <PiePagina />
    </div>
  );
}