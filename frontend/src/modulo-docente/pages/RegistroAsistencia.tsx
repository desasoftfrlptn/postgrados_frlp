import { useState } from "react";
import { Link } from "react-router-dom";
import { useSeminario } from "@/dashboard-coordinador/hooks/useSeminarios";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import { useAuth } from "@/shared/auth/authContext";
import { TablaAsistencia } from "../components/TablaAsistencia";
import { useActualizarAsistencia, useClasesSeminario, useConfirmarClase, useCrearClase } from "../hooks/useAsistencia";

const fechaLocal = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });

export function RegistroAsistencia({ id }: { id: string }) {
  const { user } = useAuth();
  const puedeProgramar = user?.rol === "coordinador" || user?.rol === "admin";
  const planilla = useSeminario(id);
  const clases = useClasesSeminario(id);
  const crear = useCrearClase(id);
  const actualizar = useActualizarAsistencia(id);
  const confirmar = useConfirmarClase(id);
  const [fecha, setFecha] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState("");
  const ocupado = crear.isPending || actualizar.isPending || confirmar.isPending;
  const error = planilla.error ?? clases.error;
  const errorGuardado = crear.error ?? actualizar.error ?? confirmar.error;
  const hoy = fechaLocal();
  const datos = planilla.data;

  async function exportar() {
    if (!datos) return;
    setErrorExportar("");
    setExportando(true);
    try {
      const XLSX = await import("xlsx-js-style");
      const filas = [
        ["Apellido", "Nombre", "Email", "Carrera de grado", ...datos.fechas, "% de asistencia"],
        ...datos.alumnos.map((alumno) => [
          alumno.apellido, alumno.nombre, alumno.email, alumno.carrera_grado,
          ...alumno.asistencias,
          { t: "n", v: alumno.porcentaje / 100, z: "0.0%" },
        ]),
      ];
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), "Asistencia");
      XLSX.writeFile(libro, `asistencia-${id}.xlsx`);
    } catch {
      setErrorExportar("No se pudo descargar la planilla. Intentá nuevamente.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <section className="space-y-4">
      <Link to="/seminarios" className="text-sm font-medium text-brand-500 hover:underline">
        Volver a seminarios
      </Link>
      <h1>{datos?.seminario ?? "Registro de asistencia"}</h1>
      {error ? (
        <div role="alert" className="space-y-2 text-sm text-semaforo-rojo">
          <p>{error.message}</p>
          <Button variant="outline" onClick={() => { void planilla.refetch(); void clases.refetch(); }}>
            Reintentar
          </Button>
        </div>
      ) : datos && clases.data ? (
        <>
          <div className="flex flex-wrap gap-2">
            {puedeProgramar && (
              <Button disabled={ocupado || fecha !== null} onClick={() => {
                crear.reset();
                actualizar.reset();
                confirmar.reset();
                setFecha(hoy);
              }}>
                Programar clase
              </Button>
            )}
            <Button variant="outline" disabled={ocupado || exportando} onClick={exportar}>
              {exportando ? "Descargando…" : "Descargar Excel"}
            </Button>
          </div>
          {fecha !== null && (
            <form
              className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-paper-surface p-4"
              onSubmit={(event) => {
                event.preventDefault();
                actualizar.reset();
                crear.mutate(fecha, { onSuccess: () => setFecha(null) });
              }}
            >
              <label className="grid gap-1 text-sm font-medium">
                Fecha de la clase
                <input type="date" required value={fecha} disabled={ocupado} onChange={(event) => setFecha(event.target.value)} />
              </label>
              <Button type="submit" disabled={ocupado || !fecha}>Guardar fecha</Button>
              <Button variant="outline" disabled={ocupado} onClick={() => { setFecha(null); crear.reset(); }}>
                Cancelar
              </Button>
            </form>
          )}
          {(errorGuardado || errorExportar) && (
            <p role="alert" className="text-sm text-semaforo-rojo">{errorGuardado?.message ?? errorExportar}</p>
          )}
          <p role="status" className="text-sm text-ink-muted">
            {ocupado ? "Guardando…" : (crear.isSuccess || actualizar.isSuccess || confirmar.isSuccess) && !errorGuardado ? "Cambios guardados." : ""}
          </p>
          <TablaAsistencia
            alumnos={datos.alumnos}
            clases={clases.data}
            hoy={hoy}
            disabled={ocupado}
            onConfirmarClase={(claseId, dictada) => {
              crear.reset();
              actualizar.reset();
              confirmar.mutate({ claseId, dictada });
            }}
            onToggleAsistencia={(claseId, legajoId, presente) => {
              crear.reset();
              confirmar.reset();
              actualizar.mutate({ claseId, legajoId, presente });
            }}
          />
        </>
      ) : (
        <div role="status" className="flex items-center gap-2 text-ink-muted">
          <Spinner size="sm" /> Cargando planilla…
        </div>
      )}
    </section>
  );
}