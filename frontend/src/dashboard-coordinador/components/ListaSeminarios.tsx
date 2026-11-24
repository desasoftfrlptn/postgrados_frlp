import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/Button";
import { patronSeminarioId } from "@/shared/types/types";

export default function ListaSeminarios() {
  const [id, setId] = useState("");
  const navigate = useNavigate();

  return (
    <section className="space-y-6">
      <h1>Seminarios</h1>
      <form
        className="max-w-xl space-y-4 rounded-2xl border border-line bg-paper-surface p-4 shadow-card"
        onSubmit={(event) => {
          event.preventDefault();
          navigate(`/seminarios/${id.trim().toLowerCase()}`);
        }}
      >
        <p className="text-sm text-ink-secondary">
          El catálogo todavía no está disponible. Ingresá el identificador del seminario para abrir su planilla.
        </p>
        <label className="block space-y-1 text-sm font-medium">
          <span>Identificador del seminario (UUID)</span>
          <input
            className="w-full"
            value={id}
            onChange={(event) => setId(event.target.value.trim())}
            required
            pattern={patronSeminarioId}
            title="Ingresá un UUID válido"
          />
        </label>
        <Button type="submit">Abrir seminario</Button>
      </form>
    </section>
  );
}