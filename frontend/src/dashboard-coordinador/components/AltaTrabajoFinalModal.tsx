import { useState } from "react";
import VentanaEmergente from "@/shared/components/VentanaEmergente";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useCrearTrabajoFinal, ApiError } from "../hooks/useTrabajoFinal";
import type { Rol, TipoTrabajoFinal } from "@/shared/types/types";
 
const TIPOS: { value: TipoTrabajoFinal; label: string }[] = [
  { value: "TFI", label: "Trabajo Final Integrador" },
  { value: "Maestria", label: "Maestría" },
  { value: "Doctorado", label: "Doctorado" },
];
 
interface AltaTrabajoFinalModalProps {
  isOpen: boolean;
  onClose: () => void;
  legajoId: string;
  usuarioRol: Rol;
}
 
export function AltaTrabajoFinalModal({
  isOpen,
  onClose,
  legajoId,
  usuarioRol,
}: AltaTrabajoFinalModalProps) {
  const [tipo, setTipo] = useState<TipoTrabajoFinal>("TFI");
  const [titulo, setTitulo] = useState("");
  const [director, setDirector] = useState("");
  const [codirector, setCodirector] = useState("");
  const [fechaCpr, setFechaCpr] = useState("");
  const [numeroResolucion, setNumeroResolucion] = useState("");
  const [erroresCampo, setErroresCampo] = useState<Record<string, string>>({});
 
  const crear = useCrearTrabajoFinal(legajoId);
 
  const puedeCrear = usuarioRol === "cpr";
 
  function limpiarYcerrar() {
    setTipo("TFI");
    setTitulo("");
    setDirector("");
    setCodirector("");
    setFechaCpr("");
    setNumeroResolucion("");
    setErroresCampo({});
    crear.reset();
    onClose();
  }
 
  function validar(): boolean {
    const errores: Record<string, string> = {};
    if (!titulo.trim()) errores.titulo = "El título es obligatorio.";
    if (!director.trim()) errores.director = "El director es obligatorio.";
    if (!fechaCpr) errores.fechaCpr = "La fecha CPR es obligatoria.";
    if (!numeroResolucion.trim()) errores.numeroResolucion = "El N.º de resolución es obligatorio.";
    setErroresCampo(errores);
    return Object.keys(errores).length === 0;
  }
 
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
 
    crear.mutate(
      {
        tipo,
        titulo: titulo.trim(),
        director: director.trim(),
        codirector: codirector.trim() || null,
        fecha_cpr: fechaCpr,
        numero_resolucion: numeroResolucion.trim(),
      },
      { onSuccess: limpiarYcerrar }
    );
  }
 
  const es403 = crear.isError && crear.error instanceof ApiError && crear.error.statusCode === 403;
 
  return (
    <VentanaEmergente isOpen={isOpen} onClose={limpiarYcerrar} title="Alta de Trabajo Final / Tesis">
      {!puedeCrear ? (
        <div className="space-y-3">
          <p className="text-sm text-semaforo-rojo">
            No tenés permisos para registrar un trabajo final. Esta acción está reservada al rol CPR.
          </p>
          <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={limpiarYcerrar}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="tipo-trabajo" className="text-sm font-medium text-ink-secondary">
              Tipo
            </label>
            <select id="tipo-trabajo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoTrabajoFinal)}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
 
          <Input
            label="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            error={erroresCampo.titulo}
          />
          <Input
            label="Director"
            value={director}
            onChange={(e) => setDirector(e.target.value)}
            required
            error={erroresCampo.director}
          />
          <Input
            label="Codirector"
            value={codirector}
            onChange={(e) => setCodirector(e.target.value)}
            hint="Opcional"
          />
          <Input
            label="Fecha CPR"
            type="date"
            value={fechaCpr}
            onChange={(e) => setFechaCpr(e.target.value)}
            required
            error={erroresCampo.fechaCpr}
          />
          <Input
            label="N.º Resolución"
            value={numeroResolucion}
            onChange={(e) => setNumeroResolucion(e.target.value)}
            required
            error={erroresCampo.numeroResolucion}
          />
 
          {crear.isError && (
            <p role="alert" className="text-sm text-semaforo-rojo">
              {es403
                ? "No tenés permisos para realizar esta acción."
                : `No se pudo guardar: ${(crear.error as Error).message}`}
            </p>
          )}
 
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={limpiarYcerrar}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={crear.isPending}>
              Guardar
            </Button>
          </div>
        </form>
      )}
    </VentanaEmergente>
  );
}
 