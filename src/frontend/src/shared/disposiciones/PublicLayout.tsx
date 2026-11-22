import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import BarraNavHome from "../componentes/BarraNavHome/BarraNavHome";
import PiePagina from "../componentes/PiePagina/PiePagina";

import {
  obtenerConfiguracionContacto,
  type ContactoPublicoContexto,
} from "../api/contacto";

import "./PublicLayout.css";

export default function PublicLayout() {
  const [contacto, setContacto] =
    useState<ContactoPublicoContexto>({
      configuracion: {},
      cargando: true,
      error: "",
    });

  useEffect(() => {
    let activo = true;

    async function cargarContacto() {
      try {
        const respuesta =
          await obtenerConfiguracionContacto();

        if (!activo) return;

        setContacto({
          configuracion: respuesta.valores,
          cargando: false,
          error: "",
        });
      } catch {
        if (!activo) return;

        setContacto({
          configuracion: {},
          cargando: false,
          error:
            "No se pudo cargar la información de contacto.",
        });
      }
    }

    void cargarContacto();

    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="layout-publico">
      <BarraNavHome />

      <main className="layout-publico-contenido">
        <Outlet context={contacto} />
      </main>

      <PiePagina
        configuracion={contacto.configuracion}
        cargando={contacto.cargando}
        error={contacto.error}
      />
    </div>
  );
}