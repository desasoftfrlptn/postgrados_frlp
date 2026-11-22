// Formulario público de preinscripción para aspirantes a carreras de posgrado.

import { useEffect, useRef, useState } from "react";
import { api } from "../../../shared/api/client";
import ConfirmacionModal from "../../../shared/componentes/ConfirmacionModal/ConfirmacionModal";
import MensajeSistema from "../../../shared/componentes/MensajeSistema/MensajeSistema";

import {
  guardarBorrador,
  recuperarBorrador,
  eliminarBorrador,
} from "../borrador";

import {
  validarArchivoPDF,
  validarDniPasaporte,
  validarNombrePersonal,
  validarTelefonoInscripcion,
  normalizarDocumento,
  LIMITES_DATOS_INSCRIPCION,
  validarLongitud,
} from "../validaciones";

import "./FormularioInscripcion.css";

type CohorteDisponible = {
  id: string;
  nombre: string;
  anio: number;
  carrera_id: string;
  carrera_nombre: string;
};

const etapas = [
  "Datos Personales",
  "Documentación",
  "Beca (Opcional)",
  "Confirmación",
];

const provincias = [
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Ciudad Autónoma de Buenos Aires",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
  "Tucumán",
];

const DATOS_INICIALES = {
    dni: "",
    apellido: "",
    nombre: "",
    email: "",
    tipo_carrera: "",
    nacionalidad: "",
    telefono: "",
    domicilio: "",
    pais: "",
    provincia: "",
    ciudad: "",
    titulo_anterior: "",
    universidad_anterior: "",
    correo_alternativo: "",
    forma_conocio_ofertas: "",
    motivos_cursar: "",
    solicitud_beca: "",
  };

const DOCUMENTOS_INICIALES = {
    formularioPreinscripcion: null as File | null,
    formularioInscripcion: null as File | null,
    dniPasaporte: null as File | null,
    partidaNacimiento: null as File | null,
    constanciaCuitCuil: null as File | null,
    tituloGrado: null as File | null,
    tituloPosgrado: null as File | null,
    formularioBeca: null as File | null,
  };

export default function FormularioInscripcion() {
  const [inscripcionCompletada, setInscripcionCompletada] = useState(false);
  const [etapa, setEtapa] = useState(1);
  const [otroPais, setOtroPais] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
  const envioEnCurso = useRef(false);
  const guardadoPendiente = useRef<Promise<void>>(
    Promise.resolve()
  );
  const temporizadorBorrador = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const borradorBloqueado = useRef(false);
  const [confirmacionDescarte, setConfirmacionDescarte] = useState(false);
  const [descartando, setDescartando] = useState(false);
  const descarteEnCurso = useRef(false);


  const [cargandoBorrador, setCargandoBorrador] = useState(true);
  const [numeroSeguimiento, setNumeroSeguimiento] = useState("");

  const [cohortesDisponibles, setCohortesDisponibles] = useState<
    CohorteDisponible[]
  >([]);

  const [cohorteSeleccionada, setCohorteSeleccionada] = useState("");

  const [errorCohortes, setErrorCohortes] = useState("");
  const [cargandoCohortes, setCargandoCohortes] = useState(true);
  const [reintentoCohortes, setReintentoCohortes] = useState(0);

  // Consulta las cohortes y descarta respuestas desactualizadas.
  useEffect(() => {
    let activo = true;

    const cargarCohortes = async () => {
      try {
        const cohortes = await api.get<CohorteDisponible[]>(
          "/cohortes/disponibles"
        );

        if (activo) {
          setCohortesDisponibles(cohortes);
        }
      } catch {
        if (activo) {
          setCohortesDisponibles([]);
          setErrorCohortes(
            "No se pudieron consultar las carreras disponibles."
          );
        }
      } finally {
        if (activo) {
          setCargandoCohortes(false);
        }
      }
    };

    void cargarCohortes();

    return () => {
      activo = false;
    };
  }, [reintentoCohortes]);

  const reintentarConsultaCohortes = () => {
    if (cargandoCohortes) return;

    setCargandoCohortes(true);
    setErrorCohortes("");
    setReintentoCohortes((actual) => actual + 1);
  };


  const [documentos, setDocumentos] = useState(DOCUMENTOS_INICIALES);


  const [datos, setDatos] = useState(DATOS_INICIALES);

  const contieneDatos =
    Object.values(datos).some((valor) => valor.trim()) ||
    Object.values(documentos).some(Boolean) ||
    !!cohorteSeleccionada ||
    !!otroPais.trim();

  useEffect(() => {
    let activo = true;

    const cargarBorrador = async () => {
      try {
        const borrador = await recuperarBorrador();

        if (!activo) return;

        if (borrador) {
          setDatos((actuales) => ({
            ...actuales,
            ...borrador.datos,
          }));

          setDocumentos((actuales) => ({
            ...actuales,
            ...borrador.documentos,
          }));

          setOtroPais(borrador.otroPais);
          setCohorteSeleccionada(
            borrador.cohorteSeleccionada ?? ""
          );
          setEtapa(1);
        }
      } catch {
        if (activo) {
          setMensaje(
            "No se pudo recuperar el borrador guardado."
          );
        }
      } finally {
        if (activo) {
          setCargandoBorrador(false);
        }
      }
    };

    void cargarBorrador();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (
      cargandoBorrador ||
      inscripcionCompletada ||
      enviando ||
      descartando
    ) return;

    if (!contieneDatos) return;

    let activo = true;

    temporizadorBorrador.current = setTimeout(() => {
      if (borradorBloqueado.current) return;

      guardadoPendiente.current = guardadoPendiente.current
        .then(async () => {
          if (borradorBloqueado.current) return;

          await guardarBorrador({
            id: "inscripcion",
            datos,
            documentos,
            otroPais,
            cohorteSeleccionada,
            etapa,
            actualizadoEn: Date.now(),
          });
        })
        .catch(() => {
          if (activo && !borradorBloqueado.current) {
            setMensaje("No se pudo guardar el borrador.");
          }
        });
    }, 500);

    return () => {
      activo = false;
      clearTimeout(temporizadorBorrador.current);
    };
  }, [
    datos,
    documentos,
    otroPais,
    cohorteSeleccionada,
    etapa,
    cargandoBorrador,
    inscripcionCompletada,
    enviando,
    descartando,
    contieneDatos,
  ]);

  const descartarBorrador = async () => {
    if (
      descarteEnCurso.current ||
      envioEnCurso.current ||
      inscripcionCompletada
    ) return;

    descarteEnCurso.current = true;
    borradorBloqueado.current = true;
    clearTimeout(temporizadorBorrador.current);

    setDescartando(true);
    setMensaje("");

    try {
      await guardadoPendiente.current;
      await eliminarBorrador();

      setDatos(DATOS_INICIALES);
      setDocumentos(DOCUMENTOS_INICIALES);
      setOtroPais("");
      setCohorteSeleccionada("");
      setEtapa(1);
    } catch {
      setMensaje(
        "No se pudo descartar el borrador. Intentá nuevamente."
      );
    } finally {
      descarteEnCurso.current = false;
      borradorBloqueado.current = false;
      setDescartando(false);
      setConfirmacionDescarte(false);
    }
  };

  // Valida y actualiza cada documento de forma independiente.
  const validarDocumento = (
    archivo: File | undefined,
    campo: keyof typeof documentos
  ) => {
    const error = archivo
      ? validarArchivoPDF(archivo)
      : null;

    setDocumentos((actuales) => ({
      ...actuales,
      [campo]: archivo && !error ? archivo : null,
    }));

    setMensaje(error ?? "");
  };

  const siguienteEtapa = () => {
    if (etapa === 2) {
      const documentosObligatorios = [
        documentos.formularioPreinscripcion,
        documentos.formularioInscripcion,
        documentos.dniPasaporte,
        documentos.partidaNacimiento,
        documentos.constanciaCuitCuil,
        documentos.tituloGrado,
      ];

      const faltaDocumento = documentosObligatorios.some(
        (documento) => documento === null
      );

      if (faltaDocumento) {
        setMensaje(
          "Debés adjuntar todos los documentos obligatorios para continuar."
        );
        return;
      }
    }

    if (etapa === 3) {
      if (datos.solicitud_beca && !documentos.formularioBeca) {
        setMensaje("Debés adjuntar el formulario de beca firmado.");
        return;
      }
    }

     setMensaje("");
    setEtapa((actual) => actual + 1);
  };

  const etapaAnterior = () => {
    if (etapa > 1) {
      setEtapa(etapa - 1);
      setMensaje("");
    }
  };

  // Valida los datos antes de avanzar o enviar la inscripción.
  const validarDatosPersonales = (): string | null => {
    const valores = {
      ...datos,
      pais: datos.pais === "Otro" ? otroPais : datos.pais,
    };

    for (const [campo, limite] of Object.entries(
      LIMITES_DATOS_INSCRIPCION
    )) {
      const valor = valores[campo as keyof typeof valores];

      if (!validarLongitud(valor, limite)) {
        return `El campo ${campo.replaceAll("_", " ")} no puede superar los ${limite} caracteres.`;
      }
    }

    const obligatorios = [
      [datos.apellido, "apellido"],
      [datos.nombre, "nombre"],
      [datos.nacionalidad, "nacionalidad"],
      [datos.dni, "DNI o pasaporte"],
      [datos.email, "correo electrónico"],
      [datos.telefono, "teléfono"],
      [datos.domicilio, "domicilio"],
      [datos.pais === "Otro" ? otroPais : datos.pais, "país"],
      [datos.provincia, "provincia"],
      [datos.ciudad, "ciudad"],
      [datos.titulo_anterior, "título anterior"],
      [datos.universidad_anterior, "universidad anterior"],
      [datos.forma_conocio_ofertas, "origen de la consulta"],
      [datos.motivos_cursar, "motivos para cursar"],
    ];

    for (const [valor, campo] of obligatorios) {
      if (!valor.trim()) {
        return `Completá el campo ${campo}.`;
      }
    }

    if (!validarNombrePersonal(datos.nombre)) {
      return "Ingresá un nombre válido.";
    }

    if (!validarNombrePersonal(datos.apellido)) {
      return "Ingresá un apellido válido.";
    }

    if (!validarDniPasaporte(datos.dni)) {
      return "Ingresá un DNI o pasaporte válido.";
    }

    if (!validarTelefonoInscripcion(datos.telefono)) {
      return "Ingresá un teléfono válido de 7 a 15 dígitos.";
    }

    return null;
  };

  const avanzarDesdeDatosPersonales = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formulario = e.currentTarget;

    if (!formulario.checkValidity()) {
      formulario.reportValidity();
      return;
    }

    const error = validarDatosPersonales();

    if (error) {
      setMensaje(error);
      return;
    }

    siguienteEtapa();
  };


const solicitarEnvio = (e: React.FormEvent) => {
  e.preventDefault();

  if (envioEnCurso.current || inscripcionCompletada) return;

  if (
    cargandoCohortes ||
    errorCohortes ||
    !cohortesDisponibles.some(
      (cohorte) =>
        cohorte.id === cohorteSeleccionada &&
        cohorte.carrera_nombre === datos.tipo_carrera
    )
  ) {
    setMensaje("Seleccioná una carrera y una cohorte disponible.");
    setEtapa(1);
    return;
  }

  const errorPersonal = validarDatosPersonales();

  if (errorPersonal) {
    setMensaje(errorPersonal);
    setEtapa(1);
    return;
  }

  const obligatorios = [
    documentos.formularioPreinscripcion,
    documentos.formularioInscripcion,
    documentos.dniPasaporte,
    documentos.partidaNacimiento,
    documentos.constanciaCuitCuil,
    documentos.tituloGrado,
  ];

  if (obligatorios.some((documento) => !documento)) {
    setMensaje("Debés adjuntar todos los documentos obligatorios.");
    setEtapa(2);
    return;
  }

  if (datos.solicitud_beca && !documentos.formularioBeca) {
    setMensaje("Debés adjuntar el formulario de beca firmado.");
    setEtapa(3);
    return;
  }

  setMensaje("");
  setConfirmacionAbierta(true);
};

const enviarFormulario = async () => {
  if (envioEnCurso.current || inscripcionCompletada) return;

  if (!cohorteSeleccionada || !datos.tipo_carrera) {
    setMensaje("Seleccioná una carrera y una cohorte disponible.");
    setEtapa(1);
    return;
  }

  const formulario = new FormData();

  formulario.append("cohorte_id", cohorteSeleccionada);
  formulario.append("carrera_elegida", datos.tipo_carrera);
  formulario.append("apellido", datos.apellido);
  formulario.append("nombre", datos.nombre);
  formulario.append("nacionalidad", datos.nacionalidad);
  formulario.append(
    "dni_pasaporte",
    normalizarDocumento(datos.dni)
  );
  formulario.append("correo_electronico", datos.email);
  formulario.append("telefono_movil", datos.telefono);
  if (datos.correo_alternativo.trim()) {
  formulario.append("correo_alternativo", datos.correo_alternativo);
}
  formulario.append("domicilio", datos.domicilio);
  formulario.append(
    "pais",
    datos.pais === "Otro" ? otroPais : datos.pais
  );
  formulario.append("provincia", datos.provincia);
  formulario.append("ciudad", datos.ciudad);
  formulario.append("titulo_anterior", datos.titulo_anterior);
  formulario.append("universidad_anterior", datos.universidad_anterior);
  formulario.append("forma_conocio_ofertas", datos.forma_conocio_ofertas);
  formulario.append("motivos_cursar", datos.motivos_cursar);

  if (datos.solicitud_beca) {
    formulario.append("solicitud_beca", datos.solicitud_beca);
  }

  const documentosFormulario = [
    ["formularioPreinscripcion", documentos.formularioPreinscripcion],
    ["formularioInscripcion", documentos.formularioInscripcion],
    ["dniPasaporte", documentos.dniPasaporte],
    ["partidaNacimiento", documentos.partidaNacimiento],
    ["constanciaCuitCuil", documentos.constanciaCuitCuil],
    ["tituloGrado", documentos.tituloGrado],
    ["tituloPosgrado", documentos.tituloPosgrado],
    [
      "formularioBeca",
      datos.solicitud_beca
        ? documentos.formularioBeca
        : null,
    ],
  ] as const;

  documentosFormulario.forEach(([campo, archivo]) => {
    if (archivo) {
      formulario.append(campo, archivo);
    }
  });

  envioEnCurso.current = true;
  borradorBloqueado.current = true;
  clearTimeout(temporizadorBorrador.current);
  setEnviando(true);
  setMensaje("");

  try {
    const resultado = await api.postForm<{
      numero_seguimiento: string;
    }>("/inscripcion/", formulario);

    setInscripcionCompletada(true);

    try {
      await guardadoPendiente.current;
      await eliminarBorrador();
    } catch (error) {
      console.error("No se pudo eliminar el borrador:", error);
    }

  setDatos(DATOS_INICIALES);

  setDocumentos(DOCUMENTOS_INICIALES);

  setOtroPais("");
  setCohorteSeleccionada("");
  setNumeroSeguimiento(resultado.numero_seguimiento ?? "");
  setEtapa(1);

  setMensaje(
    "Inscripción y documentación registradas correctamente."
  );
    } catch (error: unknown) {
      borradorBloqueado.current = false;
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la inscripción."
      );
    } finally {
      envioEnCurso.current = false;
      setEnviando(false);
      setConfirmacionAbierta(false);
    }
  };


  return (
    <section className="inscripcion" aria-labelledby="titulo-inscripcion">
      <section className="inscripcion-formulario">
        <h1 id="titulo-inscripcion">Formulario de Inscripción</h1>

        {!inscripcionCompletada && (
        <ol
          className="inscripcion-etapas"
          aria-label="Etapas de inscripción"
        >
          {etapas.map((nombreEtapa, indice) => {
            const numeroEtapa = indice + 1;

            return (
              <li
                key={nombreEtapa}
                className={
                  etapa === numeroEtapa
                    ? "inscripcion-etapa activa"
                    : "inscripcion-etapa"
                }
                aria-current={
                  etapa === numeroEtapa ? "step" : undefined
                }
              >
                <span aria-hidden="true">{numeroEtapa}</span>
                <p>{nombreEtapa}</p>
              </li>
            );
          })}
        </ol>
        )}

        {!inscripcionCompletada && (
          <p className="inscripcion-privacidad">
            Los datos y documentos se guardan temporalmente en este
            navegador para que puedas continuar tu inscripción.
            El borrador vence después de 24 horas sin modificaciones.
            Evitá utilizar computadoras compartidas.
          </p>
        )}

        {!cargandoBorrador &&
          !inscripcionCompletada &&
          contieneDatos && (
            <div className="inscripcion-botones">
              <button
                type="button"
                onClick={() => setConfirmacionDescarte(true)}
                disabled={
                  enviando ||
                  descartando ||
                  confirmacionAbierta ||
                  confirmacionDescarte
                }
              >
                Descartar borrador
              </button>
            </div>
        )}

        {cargandoBorrador && (
          <p role="status">
            Recuperando los datos de la inscripción...
          </p>
        )}

        <MensajeSistema
          tipo={inscripcionCompletada ? "exito" : "error"}
          texto={mensaje}
          duracion={0}
          alCerrar={() => setMensaje("")}
        />

        {numeroSeguimiento && (
          <div className="inscripcion-numero-seguimiento">
            <h3>Número de preinscripción</h3>
            <p>{numeroSeguimiento}</p>
            <span>Conservá este número para consultar tu inscripción.</span>
          </div>
        )}


        {!cargandoBorrador && !inscripcionCompletada && !descartando && etapa === 1 && (
          <form onSubmit={avanzarDesdeDatosPersonales}>
            <fieldset>
              <legend>Datos Personales</legend>

              <div className="inscripcion-campo">
                <label htmlFor="carrera">
                  Carrera Elegida <span>*</span>
                </label>

                <select
                  id="carrera"
                  name="carrera"
                  required
                  value={datos.tipo_carrera}
                  disabled={cargandoCohortes || !!errorCohortes}
                  onChange={(e) => {
                    setDatos({
                      ...datos,
                      tipo_carrera: e.target.value,
                    });
                    setCohorteSeleccionada("");
                  }}
                >
                  <option value="">Seleccionar carrera</option>

                  {[...new Set(
                    cohortesDisponibles.map(
                      (cohorte) => cohorte.carrera_nombre
                    )
                  )].map((nombre) => (
                    <option key={nombre} value={nombre}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="cohorte">
                  Cohorte <span>*</span>
                </label>

                <select
                  id="cohorte"
                  name="cohorte"
                  required
                  value={cohorteSeleccionada}
                  disabled={!datos.tipo_carrera || cargandoCohortes}
                  onChange={(e) =>
                    setCohorteSeleccionada(e.target.value)
                  }
                >
                  <option value="">Seleccionar cohorte</option>

                  {cohortesDisponibles
                    .filter(
                      (cohorte) =>
                        cohorte.carrera_nombre === datos.tipo_carrera
                    )
                    .map((cohorte) => (
                      <option key={cohorte.id} value={cohorte.id}>
                        {cohorte.nombre} ({cohorte.anio})
                      </option>
                    ))}
                </select>
              </div>

              {errorCohortes && (
                <div>
                  <MensajeSistema
                    tipo="error"
                    texto={errorCohortes}
                  />

                  <div className="inscripcion-botones">
                    <button
                      type="button"
                      onClick={reintentarConsultaCohortes}
                      disabled={cargandoCohortes}
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              )}

              {cargandoCohortes && (
                <p className="inscripcion-mensaje" role="status">
                  Cargando carreras y cohortes...
                </p>
              )}

              {!cargandoCohortes && !errorCohortes && cohortesDisponibles.length === 0 && (
                <p className="inscripcion-mensaje" role="status">
                  No hay cohortes abiertas para inscripción.
                </p>
              )}

              <div className="inscripcion-campo">
                <label htmlFor="apellido">
                  Apellido/s <span>*</span>
                </label>

                <input
                  id="apellido"
                  name="apellido"
                  required
                  title="El apellido solo puede contener letras."
                  placeholder="Ingresá tu apellido"
                  value={datos.apellido}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      apellido: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="nombre">
                  Nombre/s <span>*</span>
                </label>

                <input
                  id="nombre"
                  name="nombre"
                  required
                  title="El nombre solo puede contener letras."
                  placeholder="Ingresá tu nombre"
                  value={datos.nombre}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      nombre: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="nacionalidad">
                  Nacionalidad <span>*</span>
                </label>

                <input
                  id="nacionalidad"
                  name="nacionalidad"
                  required
                  title="La nacionalidad solo puede contener letras."
                  placeholder="Ingresá tu nacionalidad"
                  value={datos.nacionalidad}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      nacionalidad: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="dni">
                  DNI o Pasaporte <span>*</span>
                </label>

                <input
                  id="dni"
                  name="dni"
                  type="text"
                  required
                  title="El DNI solo puede tener 7 u 8 dígitos. El pasaporte solo puede tener de 6 a 20 carácteres alfanúmericos."
                  placeholder="Ingresá tu DNI o Pasaporte"
                  value={datos.dni}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      dni: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="telefono">Teléfono Móvil</label>

                <input
                  id="telefono"
                  required
                  name="telefono"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Ej: 221-221-2221"
                  value={datos.telefono}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      telefono: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="email">
                  Correo Electrónico <span>*</span>
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
                  placeholder="ejemplo@correo.com"
                  value={datos.email}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="correo_alternativo">
                  Correo Electrónico Alternativo
                </label>

                <input
                  id="correo_alternativo"
                  name="correo_alternativo"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={datos.correo_alternativo}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      correo_alternativo: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo inscripcion-campo-ancho-completo">
                <label htmlFor="domicilio">Domicilio</label>

                <input
                  id="domicilio"
                  required
                  name="domicilio"
                  placeholder="Ingresá tu domicilio actual"
                  value={datos.domicilio}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      domicilio: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="pais">
                  País <span>*</span>
                </label>

                <select
                  id="pais"
                  name="pais"
                  required
                  value={datos.pais}
                  onChange={(e) => {
                    setDatos({
                      ...datos,
                      pais: e.target.value,
                      provincia: "",
                    });

                    if (e.target.value !== "Otro") {
                      setOtroPais("");
                    }
                  }}
                >
                  <option value="">Seleccionar</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {datos.pais === "Otro" && (
                <div className="inscripcion-campo">
                  <label htmlFor="otro-pais">
                    Especificá el país <span>*</span>
                  </label>

                  <input
                    id="otro-pais"
                    name="otro-pais"
                    required
                    placeholder="Ingresá tu país"
                    value={otroPais}
                    onChange={(e) =>
                      setOtroPais(e.target.value)
                    }
                  />
                </div>
              )}

              <div className="inscripcion-campo">
                <label htmlFor="provincia">
                  Provincia <span>*</span>
                </label>

                {datos.pais === "Otro" ? (
                  <input
                    id="provincia"
                    name="provincia"
                    required
                    placeholder="Ingresá tu provincia, región o estado"
                    value={datos.provincia}
                    onChange={(e) =>
                      setDatos((actuales) => ({
                        ...actuales,
                        provincia: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <select
                  id="provincia"
                  name="provincia"
                  required
                  value={datos.provincia}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      provincia: e.target.value,
                    })
                  }
                >
                  <option value="">Seleccionar</option>

                  {provincias.map((provincia) => (
                    <option key={provincia} value={provincia}>
                      {provincia}
                    </option>
                  ))}
                </select>
                )}
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="ciudad">
                  Ciudad <span>*</span>
                </label>

                <input
                  id="ciudad"
                  name="ciudad"
                  required
                  title="La ciudad solo puede contener letras."
                  placeholder="Ingresá tu ciudad"
                  value={datos.ciudad}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      ciudad: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="titulo_anterior">
                  Título anterior <span>*</span>
                </label>

                <input
                  id="titulo_anterior"
                  name="titulo_anterior"
                  required
                  placeholder="Ingresá tu titulación anterior"
                  value={datos.titulo_anterior}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      titulo_anterior: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="universidad_anterior">
                  Universidad Anterior <span>*</span>
                </label>

                <input
                  id="universidad_anterior"
                  name="universidad_anterior"
                  required
                  placeholder="Ingresá tu institución anterior"
                  value={datos.universidad_anterior}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      universidad_anterior: e.target.value,
                    })
                  }
                />
              </div>

              <div className="inscripcion-campo">
                <label htmlFor="forma_conocio_ofertas">
                  ¿Cómo conociste la oferta de posgrado? <span>*</span>
                </label>
                <select
                  id="forma_conocio_ofertas"
                  name="forma_conocio_ofertas"
                  required
                  value={datos.forma_conocio_ofertas}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      forma_conocio_ofertas: e.target.value,
                    })
                  }
                >
                  <option value="">Seleccionar</option>
                  <option value="Sitio web">Sitio web</option>
                  <option value="Otros sitios web">Otros sitios web</option>
                  <option value="Egresados de la UTN FRLP">
                    Egresados de la UTN FRLP
                  </option>
                  <option value="Comentarios de colegas u otros">
                    Comentarios de colegas u otros
                  </option>
                </select>
              </div>

              <div className="inscripcion-campo inscripcion-campo-ancho-completo">
                <label htmlFor="motivos_cursar">
                  Motivos por los cuales desea cursar la carrera <span>*</span>
                </label>

                <textarea
                  id="motivos_cursar"
                  name="motivos_cursar"
                  required
                  rows={4}
                  placeholder="Contanos brevemente tus motivos"
                  value={datos.motivos_cursar}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      motivos_cursar: e.target.value,
                    })
                  }
                />
              </div>

            </fieldset>

            <div className="inscripcion-botones">
              <button
                type="submit"
                disabled={
                  cargandoCohortes ||
                  !!errorCohortes ||
                  cohortesDisponibles.length === 0
                }
              >
                Siguiente
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        )}

        {!cargandoBorrador && !inscripcionCompletada && !descartando && etapa === 2 && (
          <section className="inscripcion-contenido-etapa">
            <h2>Documentación</h2>

            <p>
              Adjuntá la documentación requerida para completar la inscripción.
            </p>

            <p className="inscripcion-aviso-documentacion">
              <span className="inscripcion-aviso-icono" aria-hidden="true"/>
              <span>Solo se admiten archivos en formato PDF.</span>
            </p>

            <fieldset className="inscripcion-documentacion">
              <legend>Documentación requerida</legend>

              <div className="inscripcion-documento">
                <label htmlFor="formulario-preinscripcion">
                  Formulario de preinscripción con firma analógica
                  <span>*</span>
                </label>

                <input
                  id="formulario-preinscripcion"
                  name="formulario-preinscripcion"
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) =>
                    validarDocumento(
                      e.target.files?.[0],
                      "formularioPreinscripcion"
                    )
                  }
                />

                {documentos.formularioPreinscripcion && (
                  <p>
                    Archivo: {documentos.formularioPreinscripcion.name}
                    <br />
                    Tamaño:{" "}
                    {(
                      documentos.formularioPreinscripcion.size /
                      (1024 * 1024)
                    ).toFixed(2)}{" "}
                     MB
                  </p>
                )}
              </div>

              <div className="inscripcion-documento">
                <label htmlFor="formulario-inscripcion">
                  Formulario de inscripción con firma analógica
                  <span>*</span>
                </label>

                <input
                  id="formulario-inscripcion"
                  name="formulario-inscripcion"
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) =>
                    validarDocumento(
                      e.target.files?.[0],
                      "formularioInscripcion"
                    )
                  }
                />

                {documentos.formularioInscripcion && (
                  <p>
                    Archivo: {documentos.formularioInscripcion.name}
                    <br />
                    Tamaño:{" "}
                    {(
                      documentos.formularioInscripcion.size /
                      (1024 * 1024)
                    ).toFixed(2)}{" "}
                     MB
                  </p>
                )}
              </div>


              <div className="inscripcion-documento">
                <label htmlFor="dni-pasaporte">
                  Copia de DNI o pasaporte <span>*</span>
                </label>

                <input
                  id="dni-pasaporte"
                  name="dni-pasaporte"
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) =>
                    validarDocumento(
                      e.target.files?.[0],
                      "dniPasaporte"
                    )
                  }
                />

                {documentos.dniPasaporte && (
                  <p>Archivo: {documentos.dniPasaporte.name}</p>
                )}
              </div>


              <div className="inscripcion-documento">
                <label htmlFor="partida-nacimiento">
                  Copia de la partida de nacimiento
                  <span>*</span>
                </label>

                <input
                  id="partida-nacimiento"
                  name="partida-nacimiento"
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) =>
                    validarDocumento(
                      e.target.files?.[0],
                      "partidaNacimiento"
                    )
                  }
                />
                {documentos.partidaNacimiento && (
                  <p>
                    Archivo: {documentos.partidaNacimiento.name}
                    <br />
                    Tamaño:{" "}
                    {(
                      documentos.partidaNacimiento.size /
                      (1024 * 1024)
                    ).toFixed(2)}{" "}
                     MB
                  </p>
                )}
              </div>

              <div className="inscripcion-documento">
                <label htmlFor="constancia-cuit-cuil">
                  Constancia de CUIT-CUIL
                  <span>*</span>
                </label>

                <input
                  id="constancia-cuit-cuil"
                  name="constancia-cuit-cuil"
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) =>
                    validarDocumento(
                      e.target.files?.[0],
                      "constanciaCuitCuil"
                    )
                }
                />
                {documentos.constanciaCuitCuil && (
                  <p>
                    Archivo: {documentos.constanciaCuitCuil.name}
                    <br />
                    Tamaño:{" "}
                    {(
                      documentos.constanciaCuitCuil.size /
                      (1024 * 1024)
                    ).toFixed(2)}{" "}
                     MB
                  </p>
                )}
              </div>

              <div className="inscripcion-documento">
                <label htmlFor="titulo-grado">
                  Copia del título de grado
                  <span>*</span>
                </label>

                <input
                  id="titulo-grado"
                  name="titulo-grado"
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) =>
                    validarDocumento(
                      e.target.files?.[0],
                      "tituloGrado"
                    )
                  }
                />
                {documentos.tituloGrado && (
                  <p>
                    Archivo: {documentos.tituloGrado.name}
                    <br />
                    Tamaño:{" "}
                    {(
                      documentos.tituloGrado.size /
                      (1024 * 1024)
                    ).toFixed(2)}{" "}
                     MB
                  </p>
                )}
              </div>

              <div className="inscripcion-documento">
                <label htmlFor="titulo-posgrado">
                  Copia del título de posgrado
                </label>

                <input
                  id="titulo-posgrado"
                  name="titulo-posgrado"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    validarDocumento(
                      e.target.files?.[0],
                      "tituloPosgrado"
                    )
                  }
                />
                {documentos.tituloPosgrado && (
                  <p>
                    Archivo: {documentos.tituloPosgrado.name}
                    <br />
                    Tamaño:{" "}
                    {(
                      documentos.tituloPosgrado.size /
                      (1024 * 1024)
                    ).toFixed(2)}{" "}
                     MB
                  </p>
                )}
              </div>




            </fieldset>

            <div className="inscripcion-botones">
              <button type="button" onClick={etapaAnterior}>
                <span aria-hidden="true">←</span>
                Anterior
              </button>

              <button type="button" onClick={siguienteEtapa}>
                Siguiente
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>
        )}

       {!cargandoBorrador && !inscripcionCompletada && !descartando && etapa === 3 && (
          <section className="inscripcion-contenido-etapa">
            <h2>Beca (Opcional)</h2>

            <p>
              Seleccioná el porcentaje de beca que corresponde a tu situación.
            </p>

            <fieldset className="inscripcion-beca">
              <legend>Solicitud de beca</legend>

              <div className="inscripcion-opcion-beca">
                <input
                  id="sin-beca"
                  name="solicitud_beca"
                  type="radio"
                  value=""
                  checked={datos.solicitud_beca === ""}
                  onChange={() => {
                    setDatos({
                      ...datos,
                      solicitud_beca: "",
                    });

                    setDocumentos((actuales) => ({
                      ...actuales,
                      formularioBeca: null,
                    }));
                  }}
                />

                <label htmlFor="sin-beca">
                  No solicitar beca
                </label>
              </div>

              <div className="inscripcion-opcion-beca">
                <input
                  id="beca-30"
                  name="solicitud_beca"
                  type="radio"
                  value="30"
                  checked={datos.solicitud_beca === "30"}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      solicitud_beca: e.target.value,
                    })
                  }
                />

                <label htmlFor="beca-30">
                  Solicitar beca del 30%
                </label>
              </div>

              <div className="inscripcion-opcion-beca">
                <input
                  id="beca-100"
                  name="solicitud_beca"
                  type="radio"
                  value="100"
                  checked={datos.solicitud_beca === "100"}
                  onChange={(e) =>
                    setDatos({
                      ...datos,
                      solicitud_beca: e.target.value,
                    })
                  }
                />

                <label htmlFor="beca-100">
                  Solicitar beca del 100%
                </label>
              </div>
            </fieldset>

            {datos.solicitud_beca && (
              <fieldset className="inscripcion-documentacion">
                <legend>Documentación de beca</legend>
                <div className="inscripcion-documento">
                <label htmlFor="formulario-beca">
                  Formulario de beca firmado
                  <span>*</span>
                </label>

                <input
                  id="formulario-beca"
                  name="formulario-beca"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    validarDocumento(
                      e.target.files?.[0],
                      "formularioBeca"
                    )
                  }
                />

                {documentos.formularioBeca && (
                  <p>Archivo: {documentos.formularioBeca.name}</p>
                )}
              </div>
              </fieldset>
            )}

            <p className="inscripcion-aviso-beca">
              <span className="inscripcion-aviso-icono" aria-hidden="true" />
              <span>
                La beca del 30% corresponde a graduados de la UTN y la beca del 100%
                corresponde a docentes de la UTN.
              </span>
            </p>

            <div className="inscripcion-botones">
              <button type="button" onClick={etapaAnterior}>
                <span aria-hidden="true">←</span>
                Anterior
              </button>

              <button type="button" onClick={siguienteEtapa}>
                Siguiente
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>
        )}

        {!cargandoBorrador && !inscripcionCompletada && !descartando && etapa === 4 && (
          <form
            className="inscripcion-contenido-etapa"
            onSubmit={solicitarEnvio}
          >
            <h2 className="inscripcion-titulo-confirmacion">
              Confirmación
            </h2>

            <p>
              Revisá la información ingresada antes de confirmar la inscripción.
            </p>

            <div className="inscripcion-resumen-grid">
              <section className="inscripcion-resumen">
                <div className="inscripcion-resumen-encabezado">
                  <h3>Datos personales</h3>

                  <button
                    type="button"
                    onClick={() => setEtapa(1)}
                    disabled={enviando || confirmacionAbierta}
                  >
                    Modificar
                  </button>
                </div>

                <p><strong>Carrera:</strong> {datos.tipo_carrera}</p>
                <p>
                  <strong>Cohorte:</strong>{" "}
                  {cohortesDisponibles.find(
                    (cohorte) => cohorte.id === cohorteSeleccionada
                  )?.nombre ?? "No seleccionada"}
                </p>
                <p><strong>Apellido/s:</strong> {datos.apellido}</p>
                <p><strong>Nombre/s:</strong> {datos.nombre}</p>
                <p><strong>Nacionalidad:</strong> {datos.nacionalidad}</p>
                <p><strong>DNI o Pasaporte:</strong> {datos.dni}</p>
                <p><strong>Teléfono:</strong> {datos.telefono || "No informado"}</p>
                <p><strong>Correo electrónico:</strong> {datos.email}</p>
                <p>
                  <strong>Correo electrónico alternativo:</strong>{" "}
                  {datos.correo_alternativo || "No informado"}
                </p>
                <p>
                  <strong>Domicilio:</strong> {datos.domicilio || "No informado"}
                </p>
                <p><strong>País:</strong> {datos.pais === "Otro" ? otroPais : datos.pais}</p>
                <p><strong>Provincia:</strong> {datos.provincia}</p>
                <p><strong>Ciudad:</strong> {datos.ciudad}</p>
                <p><strong>Título anterior:</strong> {datos.titulo_anterior}</p>
                <p>
                  <strong>Universidad anterior:</strong>{" "}
                  {datos.universidad_anterior}
                </p>
                <p>
                  <strong>¿Cómo conociste la oferta de posgrado?:</strong>{" "}
                  {datos.forma_conocio_ofertas}
                </p>
                <p>
                  <strong>Motivos para cursar la carrera:</strong>{" "}
                  {datos.motivos_cursar}
                </p>
              </section>

              <section className="inscripcion-resumen">
                <div className="inscripcion-resumen-encabezado">
                  <h3>Documentación</h3>

                  <button
                    type="button"
                    onClick={() => setEtapa(2)}
                    disabled={enviando || confirmacionAbierta}
                  >
                    Modificar
                  </button>
                </div>

                <p>
                  <strong>Formulario de preinscripción:</strong>{" "}
                  {documentos.formularioPreinscripcion?.name || "No adjuntado"}
                </p>

                <p>
                  <strong>DNI o pasaporte:</strong>{" "}
                  {documentos.dniPasaporte?.name || "No adjuntado"}
                </p>

                <p>
                  <strong>Formulario de inscripción:</strong>{" "}
                  {documentos.formularioInscripcion?.name || "No adjuntado"}
                </p>

                <p>
                  <strong>Partida de nacimiento:</strong>{" "}
                  {documentos.partidaNacimiento?.name || "No adjuntado"}
                </p>

                <p>
                  <strong>Constancia de CUIT-CUIL:</strong>{" "}
                  {documentos.constanciaCuitCuil?.name || "No adjuntado"}
                </p>

                <p>
                  <strong>Título de grado:</strong>{" "}
                  {documentos.tituloGrado?.name || "No adjuntado"}
                </p>

                <p>
                  <strong>Título de posgrado:</strong>{" "}
                  {documentos.tituloPosgrado?.name || "No adjuntado"}
                </p>

                <p>
                  <strong>Formulario de beca:</strong>{" "}
                  {documentos.formularioBeca?.name || "No adjuntado"}
                </p>


              </section>

              <section className="inscripcion-resumen">
                <div className="inscripcion-resumen-encabezado">
                  <h3>Beca</h3>

                  <button
                    type="button"
                    onClick={() => setEtapa(3)}
                    disabled={enviando || confirmacionAbierta}
                  >
                    Modificar
                  </button>
                </div>

                <p>
                  <strong>Solicitud de beca:</strong>{" "}
                  {datos.solicitud_beca
                    ? `Beca del ${datos.solicitud_beca}%`
                    : "No solicita beca"}
                </p>
              </section>
            </div>

            <div className="inscripcion-botones">
              <button
                type="button"
                onClick={etapaAnterior}
                disabled={enviando || confirmacionAbierta}
              >
                <span aria-hidden="true">←</span>
                Anterior
              </button>

              <button
                type="submit"
                disabled={enviando || confirmacionAbierta}
              >
                {enviando
                  ? "Enviando inscripción..."
                  : "Confirmar inscripción"}
              </button>
            </div>
          </form>
        )}

        <ConfirmacionModal
          abierto={confirmacionDescarte}
          titulo="Descartar borrador"
          descripcion="Se eliminarán los datos y documentos guardados en este navegador. Esta acción no se puede deshacer."
          textoConfirmar="Eliminar borrador"
          alConfirmar={descartarBorrador}
          alCancelar={() => setConfirmacionDescarte(false)}
          confirmando={descartando}
          peligroso
        />

        <ConfirmacionModal
          abierto={confirmacionAbierta}
          titulo="Confirmar inscripción"
          descripcion="¿Estás seguro de que deseás registrar la inscripción con los datos y documentos ingresados?"
          textoConfirmar="Confirmar envío"
          alConfirmar={enviarFormulario}
          alCancelar={() => setConfirmacionAbierta(false)}
          confirmando={enviando}
        />
      </section>
    </section>
  );
}
