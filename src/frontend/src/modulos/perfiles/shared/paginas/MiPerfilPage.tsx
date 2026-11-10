// Muestra la información del perfil según el usuario autenticado.

import {
  useState,
  type ChangeEvent,
} from "react";

import { useAuth } from "../../../manejo-sesion/useAuth";

import CampoPerfil from "../componentes/CampoPerfil";
import CambiarContrasena from "../componentes/CambiarContrasena";

import DetallePerfilEstudiante from "../../estudiante/componentes/DetallePerfilEstudiante";
import DetallePerfilDocente from "../../docente/componentes/DetallePerfilDocente";

import "../estilos/MiPerfilPage.css";


interface DatosPerfil {
  nombre: string;
  apellido: string;
  dni: string;
  nacionalidad: string;
  email: string;
  emailAlternativo: string;
  telefono: string;
  domicilio: string;
  pais: string;
  provincia: string;
  ciudad: string;
  carrera: string;
  cohorte: string;
}


type Pestaña =
  | "Datos Personales"
  | "Contacto"
  | "Domicilio"
  | "Información"
  | "Seguridad";


export default function MiPerfilPage() {
  const { user } = useAuth();


  const esAdministrador =
    user?.rol === "ADMIN";

  const esDocente =
    user?.rol === "DOCENTE";

  const esEstudiante =
    user?.rol === "ASPIRANTE";


  const rol =
    user?.rol === "ADMIN"
      ? "Administrador"
      : user?.rol === "DOCENTE"
        ? "Docente"
        : user?.rol === "ASPIRANTE"
          ? "Estudiante"
          : user?.rol === "COORDINADOR"
            ? "Coordinador"
            : user?.rol === "CPR"
              ? "CPR"
              : "Usuario";


  const datosIniciales: DatosPerfil = {
    nombre:
      user?.nombre ?? "",

    apellido:
      user?.apellido ?? "",

    dni:
      user?.dni ?? "",

    nacionalidad: "",

    email:
      user?.email ?? "",

    emailAlternativo: "",
    telefono: "",
    domicilio: "",
    pais: "",
    provincia: "",
    ciudad: "",
    carrera: "",
    cohorte: "",
  };


  const pestañas: Pestaña[] =
    esAdministrador
      ? [
          "Datos Personales",
          "Contacto",
          "Seguridad",
        ]
      : [
          "Datos Personales",
          "Contacto",
          "Domicilio",
          "Información",
          "Seguridad",
        ];


  const claveFoto = user
    ? `fotoPerfil-${user.id}`
    : "fotoPerfil";


  const [tabActiva, setTabActiva] =
    useState<Pestaña>(
      "Datos Personales"
    );

  const [datos, setDatos] =
    useState<DatosPerfil>(
      datosIniciales
    );

  const [
    datosEditados,
    setDatosEditados,
  ] = useState<DatosPerfil>(
    datosIniciales
  );

  const [editando, setEditando] =
    useState(false);

  const [mensaje, setMensaje] =
    useState("");

  const [
    fotoPerfil,
    setFotoPerfil,
  ] = useState<string | null>(
    () =>
      localStorage.getItem(
        claveFoto
      )
  );


  const cambiarPestana = (
    pestana: Pestaña
  ) => {
    setTabActiva(
      pestana
    );

    setEditando(
      false
    );

    setDatosEditados(
      datos
    );

    setMensaje("");
  };


  const comenzarEdicion = () => {
    setDatosEditados(
      datos
    );

    setEditando(true);
    setMensaje("");
  };


  const cancelarEdicion = () => {
    setDatosEditados(
      datos
    );

    setEditando(false);
    setMensaje("");
  };


  const guardarCambios = () => {
    setDatos(
      datosEditados
    );

    setEditando(
      false
    );

    setMensaje(
      "Los datos fueron actualizados correctamente."
    );
  };


  const actualizarCampo = (
    campo: keyof DatosPerfil,
    valor: string
  ) => {
    setDatosEditados({
      ...datosEditados,
      [campo]: valor,
    });
  };


  const cambiarFoto = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const archivo =
      event.target.files?.[0];

    if (!archivo) {
      return;
    }

    if (
      !archivo.type.startsWith(
        "image/"
      )
    ) {
      setMensaje(
        "Seleccioná un archivo de imagen válido."
      );

      return;
    }

    const lector =
      new FileReader();

    lector.onload = () => {
      if (
        typeof lector.result
        !== "string"
      ) {
        return;
      }

      setFotoPerfil(
        lector.result
      );

      localStorage.setItem(
        claveFoto,
        lector.result
      );

      setMensaje(
        "La foto de perfil fue actualizada."
      );
    };

    lector.readAsDataURL(
      archivo
    );
  };


  const eliminarFoto = () => {
    setFotoPerfil(
      null
    );

    localStorage.removeItem(
      claveFoto
    );

    setMensaje(
      "La foto de perfil fue eliminada."
    );
  };


  return (
    <section className="perfil-pagina mi-perfil">
      <header className="perfil-pagina-encabezado">
        <h1>
          Mi Perfil
        </h1>

        <p>
          Consultá y actualizá la información
          registrada en tu perfil.
        </p>
      </header>


      <nav
        className="mi-perfil-pestanas"
        aria-label="Secciones del perfil"
      >
        {pestañas.map(
          (pestaña) => (
            <button
              key={pestaña}
              type="button"
              onClick={() =>
                cambiarPestana(
                  pestaña
                )
              }
              className={
                tabActiva === pestaña
                  ? "mi-perfil-pestana activa"
                  : "mi-perfil-pestana"
              }
            >
              {pestaña}
            </button>
          )
        )}
      </nav>


      {mensaje && (
        <p
          className="mi-perfil-mensaje"
          role="status"
        >
          {mensaje}
        </p>
      )}


      <div className="mi-perfil-contenido">
        <article className="mi-perfil-tarjeta-personal">
          <header>
            {rol}
          </header>


          <div className="mi-perfil-avatar-contenedor">
            {fotoPerfil ? (
              <img
                src={fotoPerfil}
                alt={
                  `Foto de perfil de ${datos.nombre} ${datos.apellido}`
                }
                className="mi-perfil-avatar"
              />
            ) : (
              <span
                className="mi-perfil-avatar mi-perfil-avatar-vacio"
                aria-hidden="true"
              >
                👤
              </span>
            )}


            {editando && (
              <div className="mi-perfil-foto-acciones">
                <label
                  htmlFor="foto-perfil"
                  className="mi-perfil-boton-foto"
                >
                  Cambiar foto
                </label>

                <input
                  id="foto-perfil"
                  type="file"
                  accept="image/*"
                  onChange={
                    cambiarFoto
                  }
                  className="mi-perfil-input-foto"
                />

                {fotoPerfil && (
                  <button
                    type="button"
                    onClick={
                      eliminarFoto
                    }
                    className="mi-perfil-eliminar-foto"
                  >
                    Eliminar foto
                  </button>
                )}
              </div>
            )}


            <h2>
              {datos.nombre}{" "}
              {datos.apellido}
            </h2>

            {datos.dni && (
              <p>
                DNI {datos.dni}
              </p>
            )}
          </div>


          <div className="mi-perfil-resumen-personal">
            <dl>
              <div>
                <dt>
                  Correo
                </dt>

                <dd>
                  {datos.email}
                </dd>
              </div>

              <div>
                <dt>
                  Rol
                </dt>

                <dd>
                  {rol}
                </dd>
              </div>
            </dl>


            {!editando &&
              tabActiva !== "Seguridad" && (
                <button
                  type="button"
                  className="mi-perfil-modificar"
                  onClick={
                    comenzarEdicion
                  }
                >
                  Modificar datos
                </button>
              )}
          </div>
        </article>


        <article className="mi-perfil-datos">
          {tabActiva ===
            "Datos Personales" && (
            <section>
              <h2>
                Datos Personales
              </h2>

              <div className="mi-perfil-grilla">
                <CampoPerfil
                  etiqueta="Nombre"
                  valor={
                    datosEditados.nombre
                  }
                  editando={
                    editando
                  }
                  onChange={(valor) =>
                    actualizarCampo(
                      "nombre",
                      valor
                    )
                  }
                />

                <CampoPerfil
                  etiqueta="Apellido"
                  valor={
                    datosEditados.apellido
                  }
                  editando={
                    editando
                  }
                  onChange={(valor) =>
                    actualizarCampo(
                      "apellido",
                      valor
                    )
                  }
                />

                <CampoPerfil
                  etiqueta="DNI"
                  valor={
                    datosEditados.dni
                  }
                  editando={
                    false
                  }
                  onChange={() => {}}
                />

                {!esAdministrador && (
                  <CampoPerfil
                    etiqueta="Nacionalidad"
                    valor={
                      datosEditados.nacionalidad
                    }
                    editando={
                      editando
                    }
                    onChange={(valor) =>
                      actualizarCampo(
                        "nacionalidad",
                        valor
                      )
                    }
                  />
                )}
              </div>
            </section>
          )}


          {tabActiva ===
            "Contacto" && (
            <section>
              <h2>
                Contacto
              </h2>

              <div className="mi-perfil-grilla">
                <CampoPerfil
                  etiqueta="Correo electrónico"
                  valor={
                    datosEditados.email
                  }
                  editando={
                    false
                  }
                  tipo="email"
                  onChange={() => {}}
                />

                {!esAdministrador && (
                  <>
                    <CampoPerfil
                      etiqueta="Correo alternativo"
                      valor={
                        datosEditados.emailAlternativo
                      }
                      editando={
                        editando
                      }
                      tipo="email"
                      onChange={(valor) =>
                        actualizarCampo(
                          "emailAlternativo",
                          valor
                        )
                      }
                    />

                    <CampoPerfil
                      etiqueta="Teléfono"
                      valor={
                        datosEditados.telefono
                      }
                      editando={
                        editando
                      }
                      tipo="tel"
                      onChange={(valor) =>
                        actualizarCampo(
                          "telefono",
                          valor
                        )
                      }
                    />
                  </>
                )}
              </div>
            </section>
          )}


          {!esAdministrador &&
            tabActiva ===
              "Domicilio" && (
              <section>
                <h2>
                  Domicilio
                </h2>

                <div className="mi-perfil-grilla">
                  <CampoPerfil
                    etiqueta="Domicilio"
                    valor={
                      datosEditados.domicilio
                    }
                    editando={
                      editando
                    }
                    onChange={(valor) =>
                      actualizarCampo(
                        "domicilio",
                        valor
                      )
                    }
                  />

                  <CampoPerfil
                    etiqueta="Ciudad"
                    valor={
                      datosEditados.ciudad
                    }
                    editando={
                      editando
                    }
                    onChange={(valor) =>
                      actualizarCampo(
                        "ciudad",
                        valor
                      )
                    }
                  />

                  <CampoPerfil
                    etiqueta="Provincia"
                    valor={
                      datosEditados.provincia
                    }
                    editando={
                      editando
                    }
                    onChange={(valor) =>
                      actualizarCampo(
                        "provincia",
                        valor
                      )
                    }
                  />

                  <CampoPerfil
                    etiqueta="País"
                    valor={
                      datosEditados.pais
                    }
                    editando={
                      editando
                    }
                    onChange={(valor) =>
                      actualizarCampo(
                        "pais",
                        valor
                      )
                    }
                  />
                </div>
              </section>
            )}


          {!esAdministrador &&
            tabActiva ===
              "Información" && (
              <>
                {esDocente && (
                  <DetallePerfilDocente />
                )}

                {esEstudiante && (
                  <DetallePerfilEstudiante
                    carrera={
                      datos.carrera
                    }
                    cohorte={
                      datos.cohorte
                    }
                  />
                )}

                {!esDocente &&
                  !esEstudiante && (
                    <section>
                      <h2>
                        Información
                      </h2>

                      <p>
                        No hay información adicional
                        disponible para este perfil.
                      </p>
                    </section>
                  )}
              </>
            )}


          {tabActiva ===
            "Seguridad" && (
            <CambiarContrasena />
          )}


          {editando &&
            tabActiva !==
              "Seguridad" && (
              <footer className="mi-perfil-acciones">
                <button
                  type="button"
                  className="mi-perfil-cancelar"
                  onClick={
                    cancelarEdicion
                  }
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="mi-perfil-guardar"
                  onClick={
                    guardarCambios
                  }
                >
                  Guardar cambios
                </button>
              </footer>
            )}
        </article>
      </div>
    </section>
  );
}