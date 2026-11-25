import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/Button";
import { useAuth } from "@/shared/auth/authContext";
import type { Seminario } from "@/shared/types/types";
import { FormularioSeminario } from "./FormularioSeminario";
import { Spinner } from "@/shared/components/Spinner";
import { useSeminarios } from "../hooks/useSeminarios";

export default function ListaSeminarios() {
  const { user } = useAuth();
  const puedeCrear = user?.rol === "coordinador" || user?.rol === "admin";
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [creado, setCreado] = useState<Seminario | null>(null);
  const [nombre, setNombre] = useState("");
  const [page, setPage] = useState(1);
  const listado = useSeminarios(nombre.trim(), page);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Seminarios</h1>
        {puedeCrear && !formularioAbierto && (
          <Button onClick={() => { setCreado(null); setFormularioAbierto(true); }}>Crear seminario</Button>
        )}
      </div>
      {puedeCrear && formularioAbierto && (
        <FormularioSeminario
          onCancelar={() => setFormularioAbierto(false)}
          onCreado={(seminario) => {
            setCreado(seminario);
            setFormularioAbierto(false);
            setNombre("");
            setPage(1);
          }}
        />
      )}
      {creado && (
        <p role="status" className="text-sm text-ink-secondary">
          Se creó <Link className="font-semibold text-brand-500 underline" to={`/seminarios/${creado.id}`}>{creado.nombre}</Link>.
        </p>
      )}
      <div className="space-y-4 rounded-2xl border border-line bg-paper-surface p-4 shadow-card">
        <label className="block max-w-md space-y-1 text-sm font-medium">
          <span>Buscar por nombre</span>
          <input
            className="w-full"
            type="search"
            maxLength={150}
            value={nombre}
            onChange={(event) => {
              setNombre(event.target.value);
              setPage(1);
            }}
          />
        </label>
        {listado.isPending ? (
          <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
            <Spinner size="sm" /> Cargando seminarios…
          </p>
        ) : listado.isError ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-semaforo-rojo">{listado.error.message}</p>
            <Button variant="outline" onClick={() => void listado.refetch()}>Reintentar</Button>
          </div>
        ) : (
          <>
            {listado.data.data.length === 0 ? (
              <p className="text-sm text-ink-muted">
                {nombre.trim() ? "No se encontraron seminarios con ese nombre." : "No hay seminarios para mostrar."}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {listado.data.data.map((seminario) => (
                  <li key={seminario.id}>
                    <Link
                      to={`/seminarios/${seminario.id}`}
                      className="block rounded-lg px-3 py-3 hover:bg-paper-elevated focus-visible:outline"
                    >
                      <span className="block font-semibold text-brand-500">{seminario.nombre}</span>
                      <span className="block text-sm text-ink-secondary">{seminario.codigo} · {seminario.docente}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {(page > 1 || listado.data.has_more) && (
              <nav aria-label="Páginas de seminarios" className="flex flex-wrap items-center gap-3 text-sm">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                <span>Página {page}</span>
                <Button variant="outline" disabled={!listado.data.has_more} onClick={() => setPage(page + 1)}>Siguiente</Button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}
