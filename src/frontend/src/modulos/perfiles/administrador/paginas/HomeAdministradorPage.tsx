// Organiza las distintas secciones administrables del sitio público.

import {
  useState,
} from "react";

import NavegacionHomeAdmin from "../home/componentes/NavegacionHomeAdmin";

import InicioAdmin from "../home/secciones/InicioAdmin";
import CarrerasPublicasAdmin from "../home/secciones/CarrerasPublicasAdmin";
import NoticiasAdmin from "../home/secciones/NoticiasAdmin";
import ContactoAdmin from "../home/secciones/ContactoAdmin";
import CalendarioPublicoAdmin from "../home/secciones/CalendarioPublicoAdmin";
import FaqAdmin from "../home/secciones/FaqAdmin";

import type {
  SeccionHomeAdmin,
} from "../home/tipos/homeAdmin";

import "../home/estilos/HomeAdministrador.css";


export default function HomeAdministradorPage() {
  const [
    seccionActiva,
    setSeccionActiva,
  ] = useState<SeccionHomeAdmin>(
    "inicio"
  );


  const mostrarSeccion = () => {
    switch (seccionActiva) {
      case "carreras":
        return (
          <CarrerasPublicasAdmin />
        );

      case "noticias":
        return (
          <NoticiasAdmin />
        );

      case "contacto":
        return (
          <ContactoAdmin />
        );

      case "calendario":
        return (
          <CalendarioPublicoAdmin />
        );

      case "faq":
        return (
          <FaqAdmin />
        );

      case "inicio":
      default:
        return (
          <InicioAdmin />
        );
    }
  };


  return (
    <section className="admin-home">
      <header className="admin-home-encabezado">
        <h1>
          Administración del sitio público
        </h1>

        <p>
          Gestioná la información que se muestra
          a los visitantes del sistema.
        </p>
      </header>

      <NavegacionHomeAdmin
        seccionActiva={
          seccionActiva
        }
        alCambiarSeccion={
          setSeccionActiva
        }
      />

      {mostrarSeccion()}
    </section>
  );
}