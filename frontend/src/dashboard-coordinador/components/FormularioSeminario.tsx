import type { FormEvent } from "react";
import { isApiError } from "@/shared/api/client";
import { Button } from "@/shared/components/Button";
import type { Seminario } from "@/shared/types/types";
import { useCrearSeminario } from "../hooks/useSeminarios";

interface FormularioSeminarioProps {
  onCancelar: () => void;
  onCreado: (seminario: Seminario) => void;
}

export function FormularioSeminario({ onCancelar, onCreado }: FormularioSeminarioProps) {
  const crear = useCrearSeminario();
  const errores = isApiError(crear.error) ? crear.error.fieldErrors : undefined;

  function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    const texto = (campo: string) => String(datos.get(campo) ?? "").trim();

    crear.mutate({
      nombre: texto("nombre"),
      codigo: texto("codigo"),
      horas_catedra: Number(texto("horas_catedra")),
      es_obligatorio: texto("es_obligatorio") === "true",
      email_docente: texto("email_docente"),
      fecha_limite_notas: texto("fecha_limite_notas") || undefined,
    }, { onSuccess: onCreado });
  }

  return (
    <form onSubmit={guardar} className="space-y-4 rounded-2xl border border-line bg-paper-surface p-4 shadow-card">
      <h2 className="font-semibold">Datos del seminario</h2>
      <fieldset disabled={crear.isPending} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Nombre
          <input name="nombre" required maxLength={150} pattern={String.raw`.*\S.*`} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Código
          <input name="codigo" required maxLength={20} pattern={String.raw`.*\S.*`} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Horas cátedra
          <input name="horas_catedra" type="number" min={1} max={2147483647} step={1} required />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Condición
          <select name="es_obligatorio" defaultValue="false">
            <option value="false">Optativo</option>
            <option value="true">Obligatorio</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Correo de la cuenta docente
          <input name="email_docente" type="email" required maxLength={255} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Fecha límite de notas (opcional)
          <input name="fecha_limite_notas" type="date" />
        </label>
      </fieldset>
      {crear.error && (
        <p role="alert" className="text-sm text-semaforo-rojo">
          {errores ? Object.values(errores).join(". ") : crear.error.message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" isLoading={crear.isPending}>Guardar seminario</Button>
        <Button type="button" variant="outline" disabled={crear.isPending} onClick={onCancelar}>Cancelar</Button>
      </div>
    </form>
  );
}