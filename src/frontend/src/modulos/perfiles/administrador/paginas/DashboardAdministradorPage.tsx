// Muestra el resumen general y los accesos principales del Administrador.

import { Link } from "react-router-dom";

import { useResumenAdmin } from "../hooks/useResumenAdmin";
import MensajeSistema from "../../../../shared/componentes/MensajeSistema/MensajeSistema";

import "../estilos/Administrador.css";


interface TarjetaAdministradorProps {
  titulo: string;
  valor: string;
  detalle: string;
  ruta: string;
  icono: string;
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
  const { datos, cargando, error, reintentar } = useResumenAdmin();
  const valor = (cantidad: number | undefined) => cargando ? "..." : cantidad?.toString() ?? "—";
  const valorUsuarios = valor(datos.usuarios?.filter(u => u.activo).length);
  const valorCarreras = valor(datos.carreras?.filter(c => c.activo).length);
  const valorSeminarios = valor(datos.seminarios?.filter(s => s.activo).length);

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


      {error && <>
        <MensajeSistema tipo="error" texto="No se pudieron cargar todos los indicadores." />
        <button type="button" onClick={reintentar}>Reintentar</button>
      </>}
      {cargando && <p role="status">Cargando indicadores...</p>}
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
            detalle="Usuarios activos"
            ruta="/dashboard/administrador/usuarios"
          />

          <TarjetaAdministrador
            titulo="Carreras"
            icono="🎓"
            valor={valorCarreras}
            detalle="Carreras activas"
            ruta="/dashboard/administrador/carreras"
          />

          <TarjetaAdministrador
            titulo="Seminarios"
            icono="📚"
            valor={valorSeminarios}
            detalle="Seminarios activos"
            ruta="/dashboard/administrador/seminarios"
          />

          <TarjetaAdministrador
            titulo="Cohortes"
            icono="📅"
            valor={valor(datos.cohortes?.filter(c => c.abierta).length)}
            detalle="Cohortes con inscripción abierta"
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
                Gestión de usuarios y reportes institucionales.
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
                  titulo="Estadísticas y reportes"
                  descripcion="Generar y descargar información del sistema."
                />
              </li>

            </ul>
          </article>
        </div>
      </section>
    </section>
  );
}