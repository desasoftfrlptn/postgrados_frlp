
import { useEffect, useState } from "react";

import { api } from "../../../shared/api/client";
import { obtenerFeriados } from "../api/feriados";
import type { Evento } from "../tipos";

import "./PaginaCalendario.css";

interface EventoAcademico extends Evento {
  id: string;
  activo: boolean;
}

interface ConfiguracionCalendario {
  titulo: string;
  descripcion: string;
  anio_minimo: string;
  anio_maximo: string;
}

const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const diasSemana = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
];

function primerDiaDelMes(anio: number, mes: number) {
  const dia = new Date(anio, mes, 1).getDay();
  return dia === 0 ? 6 : dia - 1;
}

function obtenerClaseTipo(tipo: string) {
  if (
    tipo === "receso" ||
    tipo === "fin_clases" ||
    tipo === "entrega" ||
    tipo === "actividad" ||
    tipo.startsWith("otros:")
  ) {
    return "otros";
  }

  return tipo;
}

function obtenerTipoPersonalizado(tipo: string) {
  return tipo.startsWith("otros:")
    ? tipo.slice(6)
    : null;
}

export default function PaginaCalendario() {
  const [anio, setAnio] = useState(
    () => new Date().getFullYear()
  );

  const [mes, setMes] = useState(
    () => new Date().getMonth()
  );

  const [configuracion, setConfiguracion] =
    useState<ConfiguracionCalendario>({
      titulo: "Calendario Académico",
      descripcion:
        "Consultá las fechas importantes del ciclo lectivo",
      anio_minimo: "2025",
      anio_maximo: "2027",
    });

  const [eventosAcademicos, setEventosAcademicos] =
    useState<EventoAcademico[]>([]);

  const [feriados, setFeriados] = useState<Evento[]>([]);

  const [errorEventos, setErrorEventos] = useState("");
  const [errorFeriados, setErrorFeriados] = useState("");
  const [errorConfiguracion, setErrorConfiguracion] =
    useState("");

  const ANIO_MINIMO = Number(configuracion.anio_minimo);
  const ANIO_MAXIMO = Number(configuracion.anio_maximo);

  // Obtener la configuración guardada desde Administración.
  useEffect(() => {
    let activo = true;

    async function cargarConfiguracion() {
      try {
        const respuesta = await api.get<{
          valores: Partial<ConfiguracionCalendario>;
        }>("/configuracion-publica/calendario");

        if (!activo) return;

        setConfiguracion((anterior) => ({
          ...anterior,
          ...respuesta.valores,
        }));

        const minimo = Number(
          respuesta.valores.anio_minimo ?? "2025"
        );

        const maximo = Number(
          respuesta.valores.anio_maximo ?? "2027"
        );

        if (
          !Number.isInteger(minimo) ||
          !Number.isInteger(maximo) ||
          minimo > maximo
        ) {
          setErrorConfiguracion(
            "El rango de años configurado no es válido."
          );
          return;
        }

        const hoy = new Date();

        const anioVisible = Math.min(
          Math.max(hoy.getFullYear(), minimo),
          maximo
        );

        setAnio(anioVisible);

        if (anioVisible !== hoy.getFullYear()) {
          setMes(anioVisible === minimo ? 0 : 11);
        }
      } catch {
        if (activo) {
          setErrorConfiguracion(
            "No se pudo cargar la configuración del calendario."
          );
        }
      }
    }

    void cargarConfiguracion();

    return () => {
      activo = false;
    };
  }, []);

  // Obtener los eventos académicos desde el Backend.
  useEffect(() => {
    let activo = true;

    async function cargarEventos() {
      try {
        const respuesta = await api.get<EventoAcademico[]>(
          "/eventos/publicos"
        );

        if (activo) {
          setEventosAcademicos(
            respuesta.filter((evento) => evento.activo)
          );
        }
      } catch {
        if (activo) {
          setErrorEventos(
            "No se pudieron cargar los eventos académicos."
          );
        }
      }
    }

    void cargarEventos();

    return () => {
      activo = false;
    };
  }, []);

  // Obtener los feriados del año seleccionado.
  useEffect(() => {
    let activo = true;

    async function cargarFeriados() {
      try {
        setErrorFeriados("");

        const respuesta = await obtenerFeriados(anio);

        if (activo) {
          setFeriados(respuesta);
        }
      } catch {
        if (activo) {
          setFeriados([]);
          setErrorFeriados(
            "No se pudieron cargar los feriados."
          );
        }
      }
    }

    void cargarFeriados();

    return () => {
      activo = false;
    };
  }, [anio]);

  // Eventos académicos del año seleccionado.
  const academicosDelAnio = eventosAcademicos.filter(
    (evento) => {
      const fecha = new Date(
        `${evento.fecha}T00:00:00`
      );

      return fecha.getFullYear() === anio;
    }
  );

  // Eventos académicos del mes seleccionado.
  const academicosDelMes = academicosDelAnio.filter(
    (evento) => {
      const fecha = new Date(
        `${evento.fecha}T00:00:00`
      );

      return fecha.getMonth() === mes;
    }
  );

  // Feriados del mes seleccionado.
  const feriadosDelMes = feriados.filter((evento) => {
    const fecha = new Date(
      `${evento.fecha}T00:00:00`
    );

    return (
      fecha.getFullYear() === anio &&
      fecha.getMonth() === mes
    );
  });

  // Eventos que se muestran en el listado del mes.
  const eventosVisibles = [
    ...academicosDelMes,
    ...feriadosDelMes,
  ].sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Eventos utilizados para destacar los días.
  const eventos = [
    ...academicosDelAnio,
    ...feriados,
  ];

  const cantidadDias = new Date(
    anio,
    mes + 1,
    0
  ).getDate();

  const espacios = primerDiaDelMes(anio, mes);

  const dias: (number | null)[] = [
    ...Array(espacios).fill(null),
    ...Array.from(
      { length: cantidadDias },
      (_, indice) => indice + 1
    ),
  ];

  function cambiarMes(direccion: number) {
    const fecha = new Date(
      anio,
      mes + direccion,
      1
    );

    const nuevoAnio = fecha.getFullYear();

    if (
      nuevoAnio < ANIO_MINIMO ||
      nuevoAnio > ANIO_MAXIMO
    ) {
      return;
    }

    setAnio(nuevoAnio);
    setMes(fecha.getMonth());
  }

  function cambiarAnio(nuevoAnio: number) {
    setAnio(nuevoAnio);
    setMes(0);
  }

  function buscarEvento(fecha: string) {
    return eventos.find(
      (evento) => evento.fecha === fecha
    );
  }

  const puedeRetroceder = !(
    anio === ANIO_MINIMO && mes === 0
  );

  const puedeAvanzar = !(
    anio === ANIO_MAXIMO && mes === 11
  );

  return (
    <section className="calendario-fondo">
      <section className="calendario">
        <header className="calendario-encabezado">
          <div>
            <h1>{configuracion.titulo}</h1>
            <p>{configuracion.descripcion}</p>
          </div>

          <div className="calendario-anio">
            <label htmlFor="anio">
              Seleccionar año
            </label>

            <select
              id="anio"
              value={anio}
              onChange={(e) =>
                cambiarAnio(Number(e.target.value))
              }
            >
              {Array.from(
                {
                  length: Math.max(
                    0,
                    ANIO_MAXIMO - ANIO_MINIMO + 1
                  ),
                },
                (_, indice) => ANIO_MINIMO + indice
              ).map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </div>
        </header>

        {errorConfiguracion && (
          <p className="calendario-error" role="alert">
            {errorConfiguracion}
          </p>
        )}

        {errorEventos && (
          <p className="calendario-error" role="alert">
            {errorEventos}
          </p>
        )}

        {errorFeriados && (
          <p className="calendario-error" role="alert">
            {errorFeriados}
          </p>
        )}

        <section className="calendario-cuerpo">
          <section
            className="calendario-eventos"
            aria-label="Eventos importantes"
          >
            {eventosVisibles.length === 0 ? (
              <p>No hay eventos registrados en este mes.</p>
            ) : (
              eventosVisibles.map((evento, indice) => {
                const fecha = new Date(
                  `${evento.fecha}T00:00:00`
                );

                return (
                  <article
                    key={`${evento.fecha}-${evento.titulo}-${indice}`}
                    className={
                      `calendario-evento calendario-evento-${obtenerClaseTipo(evento.tipo)}`
                    }
                  >
                    <div className="calendario-evento-fecha">
                      <span>
                        {meses[fecha.getMonth()]}
                      </span>

                      <strong>
                        {fecha.getDate()}
                      </strong>
                    </div>

                    <div className="calendario-evento-info">
                      <h2>{evento.titulo}</h2>
                      {obtenerTipoPersonalizado(evento.tipo) && (
                        <span className="calendario-evento-tipo">
                          {obtenerTipoPersonalizado(evento.tipo)}
                        </span>
                      )}
                      <p>{evento.descripcion}</p>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <section className="calendario-panel">
            <header className="calendario-navegacion">
              <button
                type="button"
                onClick={() => cambiarMes(-1)}
                aria-label="Mes anterior"
                disabled={!puedeRetroceder}
              >
                ‹
              </button>

              <h2>
                {meses[mes]} {anio}
              </h2>

              <button
                type="button"
                onClick={() => cambiarMes(1)}
                aria-label="Mes siguiente"
                disabled={!puedeAvanzar}
              >
                ›
              </button>
            </header>

            <div className="calendario-dias-semana">
              {diasSemana.map((dia) => (
                <span key={dia}>
                  {dia}
                </span>
              ))}
            </div>

            <div className="calendario-dias">
              {dias.map((dia, indice) => {
                if (dia === null) {
                  return (
                    <span key={`vacio-${indice}`} />
                  );
                }

                const fecha =
                  `${anio}-${String(mes + 1).padStart(2, "0")}` +
                  `-${String(dia).padStart(2, "0")}`;

                const evento = buscarEvento(fecha);

                return (
                  <span
                    key={fecha}
                    className={
                      evento
                        ? `calendario-dia calendario-dia-${obtenerClaseTipo(evento.tipo)}`
                        : "calendario-dia"
                    }
                  >
                    {dia}
                  </span>
                );
              })}
            </div>

            <section className="calendario-leyenda">
              <p>
                <span className="leyenda-color leyenda-clases" />
                Inicio de clases
              </p>

              <p>
                <span className="leyenda-color leyenda-inscripcion" />
                Inscripciones
              </p>

              <p>
                <span className="leyenda-color leyenda-examen" />
                Mesa de final
              </p>

              <p>
                <span className="leyenda-color leyenda-feriado" />
                Feriados
              </p>

              <p>
                <span className="leyenda-color leyenda-otros" />
                Otros eventos
              </p>
            </section>
          </section>
        </section>
      </section>
    </section>
  );
}
