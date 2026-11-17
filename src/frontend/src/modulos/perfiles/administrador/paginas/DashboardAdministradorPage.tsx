// Muestra el resumen general y los accesos principales del Administrador.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../../shared/api/client";
import { useAuth } from "../../../manejo-sesion/useAuth";

import "../estilos/Administrador.css";


interface TarjetaAdministradorProps {
  titulo: string;
  valor: string;
  detalle: string;
  ruta: string;
  icono: string;
}


interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  correo_electronico: string;
  rol: string;
  activo: boolean;
}


interface Carrera {
  id: string;
  nombre: string;
  tipo: string;
  duracion: string;
  descripcion: string;
  activo: boolean;
}


interface Seminario {
  id: string;
  nombre: string;
  carrera_id: string;
  carrera_nombre: string;
  docente_id: string;
  docente_nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}


interface AccesoAdministradorProps {
  ruta: string;
  icono: string;
  titulo: string;
  descripcion: string;
}


function TarjetaAdministrador({
  titulo,
  valor,
  detalle,
  ruta,
  icono,
}: TarjetaAdministradorProps) {
  return (
    <article className="admin-tarjeta">
      <header className="admin-tarjeta-encabezado">
        <h2>{titulo}</h2>

        <span
          className="admin-tarjeta-icono"
          aria-hidden="true"
        >
          {icono}
        </span>
      </header>

      <strong className="admin-tarjeta-valor">
        {valor}
      </strong>

      <footer className="admin-tarjeta-pie">
        <span className="admin-tarjeta-detalle">
          {detalle}
        </span>

        <Link
          to={ruta}
          className="admin-tarjeta-enlace"
        >
          Ver detalle →
        </Link>
      </footer>
    </article>
  );
}


function AccesoAdministrador({
  ruta,
  icono,
  titulo,
  descripcion,
}: AccesoAdministradorProps) {
  return (
    <Link
      to={ruta}
      className="admin-acceso"
    >
      <span
        className="admin-acceso-icono"
        aria-hidden="true"
      >
        {icono}
      </span>

      <span className="admin-acceso-contenido">
        <span className="admin-acceso-titulo">
          {titulo}
        </span>

        <span className="admin-acceso-descripcion">
          {descripcion}
        </span>
      </span>

      <span
        className="admin-acceso-flecha"
        aria-hidden="true"
      >
        →
      </span>
    </Link>
  );
}


export default function DashboardAdministradorPage() {
  const { user } = useAuth();

  const [
    cantidadUsuarios,
    setCantidadUsuarios,
  ] = useState<number | null>(null);

  const [
    cantidadCarreras,
    setCantidadCarreras,
  ] = useState<number | null>(null);

  const [
    cantidadSeminarios,
    setCantidadSeminarios,
  ] = useState<number | null>(null);

  const [
    errorUsuarios,
    setErrorUsuarios,
  ] = useState(false);

  const [
    errorCarreras,
    setErrorCarreras,
  ] = useState(false);

  const [
    errorSeminarios,
    setErrorSeminarios,
  ] = useState(false);


  useEffect(() => {
    if (!user) {
      return;
    }

    const cargarResumen = async () => {
      try {
        setErrorUsuarios(false);

        const usuarios =
          await api.get<Usuario[]>(
            "/autenticacion/usuarios",
            user.token
          );

        setCantidadUsuarios(
          usuarios.length
        );
      } catch {
        setCantidadUsuarios(null);
        setErrorUsuarios(true);
      }


      try {
        setErrorCarreras(false);

        const carreras =
          await api.get<Carrera[]>(
            "/carreras",
            user.token
          );

        setCantidadCarreras(
          carreras.length
        );
      } catch {
        setCantidadCarreras(null);
        setErrorCarreras(true);
      }


      try {
        setErrorSeminarios(false);

        const seminarios =
          await api.get<Seminario[]>(
            "/seminarios",
            user.token
          );

        setCantidadSeminarios(
          seminarios.length
        );
      } catch {
        setCantidadSeminarios(null);
        setErrorSeminarios(true);
      }
    };

    cargarResumen();
  }, [user]);


  const valorUsuarios =
    cantidadUsuarios === null
      ? errorUsuarios
        ? "-"
        : "..."
      : cantidadUsuarios.toString();


  const valorCarreras =
    cantidadCarreras === null
      ? errorCarreras
        ? "-"
        : "..."
      : cantidadCarreras.toString();


  const valorSeminarios =
    cantidadSeminarios === null
      ? errorSeminarios
        ? "-"
        : "..."
      : cantidadSeminarios.toString();


  return (
    <section className="admin-dashboard">
      <header className="admin-dashboard-encabezado">
        <h1>
          Panel de Administración
        </h1>

        <p>
          Resumen general del sistema de gestión
          de posgrado.
        </p>
      </header>


      <section
        className="admin-resumen"
        aria-labelledby="titulo-resumen"
      >
        <h2
          id="titulo-resumen"
          className="sr-only"
        >
          Resumen general
        </h2>

        <div className="admin-resumen-grilla">
          <TarjetaAdministrador
            titulo="Usuarios"
            icono="👥"
            valor={valorUsuarios}
            detalle={
              errorUsuarios
                ? "No se pudo cargar"
                : "Usuarios registrados"
            }
            ruta="/dashboard/administrador/usuarios"
          />

          <TarjetaAdministrador
            titulo="Carreras"
            icono="🎓"
            valor={valorCarreras}
            detalle={
              errorCarreras
                ? "No se pudo cargar"
                : "Carreras registradas"
            }
            ruta="/dashboard/administrador/carreras"
          />

          <TarjetaAdministrador
            titulo="Seminarios"
            icono="📚"
            valor={valorSeminarios}
            detalle={
              errorSeminarios
                ? "No se pudo cargar"
                : "Seminarios registrados"
            }
            ruta="/dashboard/administrador/seminarios"
          />

          <TarjetaAdministrador
            titulo="Cohortes"
            icono="📅"
            valor="0"
            detalle="Cohortes activas"
            ruta="/dashboard/administrador/cohortes"
          />
        </div>
      </section>


      <section
        className="admin-accesos"
        aria-labelledby="titulo-accesos"
      >
        <header className="admin-seccion-encabezado">
          <h2 id="titulo-accesos">
            Accesos rápidos
          </h2>

          <p>
            Ingresá directamente a las principales
            funciones de administración.
          </p>
        </header>


        <div className="admin-paneles">
          <article className="admin-panel">
            <header>
              <h3>
                Gestión Académica
              </h3>

              <p>
                Administración de la oferta
                académica y los ciclos lectivos.
              </p>
            </header>

            <ul className="admin-accesos-lista">
              <li>
                <AccesoAdministrador
                  ruta="/dashboard/administrador/carreras"
                  icono="🎓"
                  titulo="Carreras"
                  descripcion="Administrar la oferta de carreras de posgrado."
                />
              </li>

              <li>
                <AccesoAdministrador
                  ruta="/dashboard/administrador/seminarios"
                  icono="📚"
                  titulo="Seminarios"
                  descripcion="Gestionar seminarios, carreras y docentes asignados."
                />
              </li>

              <li>
                <AccesoAdministrador
                  ruta="/dashboard/administrador/cohortes"
                  icono="📅"
                  titulo="Cohortes"
                  descripcion="Administrar ciclos lectivos y cohortes."
                />
              </li>
            </ul>
          </article>


          <article className="admin-panel">
            <header>
              <h3>
                Administración
              </h3>

              <p>
                Gestión general de usuarios,
                información y configuración.
              </p>
            </header>

            <ul className="admin-accesos-lista">
              <li>
                <AccesoAdministrador
                  ruta="/dashboard/administrador/usuarios"
                  icono="👥"
                  titulo="Usuarios"
                  descripcion="Administrar cuentas, roles y estados."
                />
              </li>

              <li>
                <AccesoAdministrador
                  ruta="/dashboard/administrador/reportes"
                  icono="📄"
                  titulo="Reportes"
                  descripcion="Generar y descargar información del sistema."
                />
              </li>

              <li>
                <AccesoAdministrador
                  ruta="/dashboard/administrador/configuracion"
                  icono="⚙️"
                  titulo="Configuración general"
                  descripcion="Administrar parámetros generales del sistema."
                />
              </li>
            </ul>
          </article>
        </div>
      </section>
    </section>
  );
}