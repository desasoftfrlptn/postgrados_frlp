// Página pública con el calendario académico y feriados de Argentina.

import { useEffect, useState } from "react";

import { obtenerFeriados } from "../api/feriados";
import { eventosAcademicos } from "../mocks/eventosAcademicos";
import type { Evento } from "../tipos";

import "./PaginaCalendario.css";

const ANIO_MINIMO = 2025;
const ANIO_MAXIMO = 2027;

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

const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function primerDiaDelMes(anio: number, mes: number) {
  const dia = new Date(anio, mes, 1).getDay();

  return dia === 0 ? 6 : dia - 1;
}

export default function PaginaCalendario() {
  const [anio, setAnio] = useState(2026);
  const [mes, setMes] = useState(5);
  const [feriados, setFeriados] = useState<Evento[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarFeriados = async () => {
      try {
        setError("");
        setFeriados(await obtenerFeriados(anio));
      } catch {
        setFeriados([]);
        setError("No se pudieron cargar los feriados.");
      }
    };

    cargarFeriados();
  }, [anio]);

  const academicosDelAnio = eventosAcademicos.filter((evento) => {
    const fecha = new Date(`${evento.fecha}T00:00:00`);

    return fecha.getFullYear() === anio;
  });

  const feriadosDelMes = feriados.filter((evento) => {
    const fecha = new Date(`${evento.fecha}T00:00:00`);

    return fecha.getFullYear() === anio && fecha.getMonth() === mes;
  });

  const eventosVisibles = [...academicosDelAnio, ...feriadosDelMes];
  const eventos = [...academicosDelAnio, ...feriados];

  const cantidadDias = new Date(anio, mes + 1, 0).getDate();
  const espacios = primerDiaDelMes(anio, mes);

  const dias: (number | null)[] = [
    ...Array(espacios).fill(null),
    ...Array.from({ length: cantidadDias }, (_, indice) => indice + 1),
  ];

  const cambiarMes = (direccion: number) => {
    const fecha = new Date(anio, mes + direccion, 1);
    const nuevoAnio = fecha.getFullYear();

    if (nuevoAnio < ANIO_MINIMO || nuevoAnio > ANIO_MAXIMO) {
      return;
    }

    setAnio(nuevoAnio);
    setMes(fecha.getMonth());
  };

  const cambiarAnio = (nuevoAnio: number) => {
    setAnio(nuevoAnio);
    setMes(0);
  };

  const buscarEvento = (fecha: string) =>
    eventos.find((evento) => evento.fecha === fecha);

  const puedeRetroceder = !(anio === ANIO_MINIMO && mes === 0);
  const puedeAvanzar = !(anio === ANIO_MAXIMO && mes === 11);

  return (
    <section className="calendario-fondo">
      <section className="calendario">
        <header className="calendario-encabezado">
          <div>
            <h1>Calendario Académico</h1>
            <p>Consultá las fechas importantes del ciclo lectivo</p>
          </div>

          <div className="calendario-anio">
            <label htmlFor="anio">Seleccionar año</label>

            <select
              id="anio"
              value={anio}
              onChange={(e) => cambiarAnio(Number(e.target.value))}
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </header>

        {error && (
          <p className="calendario-error" role="alert">
            {error}
          </p>
        )}

        <section className="calendario-cuerpo">
          <section
            className="calendario-eventos"
            aria-label="Eventos importantes"
          >
            {eventosVisibles.length === 0 ? (
              <p>No hay eventos registrados.</p>
            ) : (
              eventosVisibles.map((evento) => {
                const fecha = new Date(`${evento.fecha}T00:00:00`);

                return (
                  <article
                    key={`${evento.fecha}-${evento.titulo}`}
                    className={`calendario-evento calendario-evento-${evento.tipo}`}
                  >
                    <div className="calendario-evento-fecha">
                      <span>{meses[fecha.getMonth()]}</span>
                      <strong>{fecha.getDate()}</strong>
                    </div>

                    <div className="calendario-evento-info">
                      <h2>{evento.titulo}</h2>
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
                <span key={dia}>{dia}</span>
              ))}
            </div>

            <div className="calendario-dias">
              {dias.map((dia, indice) => {
                if (dia === null) {
                  return <span key={`vacio-${indice}`} />;
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
                        ? `calendario-dia calendario-dia-${evento.tipo}`
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