import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAlertas } from "../hooks/useAlertas";
import ListaAlertas from "./ListaAlertas";

import "../estilos/Alertas.css";

export default function CampanaAlertas({
    seguimientoAcademico = false,
    automaticas = true
}: {
    seguimientoAcademico?: boolean;
    automaticas?: boolean;
}) {
    const [abierta, setAbierta] = useState(false);

    const bandeja = useAlertas();
    const contenedor = useRef<HTMLDivElement>(null);
    const boton = useRef<HTMLButtonElement>(null);
    const ubicacion = useLocation();

    // El menú se cierra al navegar (la clave del componente cambia en el layout).
    useEffect(() => {
        if (!abierta) return;

        function cerrar(e: PointerEvent) {
            if (!contenedor.current?.contains(e.target as Node)) {
                setAbierta(false);
            }
        }

        function teclado(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setAbierta(false);
                boton.current?.focus();
            }
        }

        document.addEventListener("pointerdown", cerrar);
        document.addEventListener("keydown", teclado);

        return () => {
            document.removeEventListener("pointerdown", cerrar);
            document.removeEventListener("keydown", teclado);
        };

    }, [abierta]);

    const cantidad = bandeja?.datos?.sin_leer;

    return (
        <div
            className="alertas-campana"
            ref={contenedor}
        >
            <button
                ref={boton}
                type="button"
                className="perfil-header-icono"
                aria-label={`Notificaciones${cantidad !== undefined ? `: ${cantidad} sin leer` : ""}`}
                aria-expanded={abierta}
                aria-controls="panel-alertas"
                onClick={() => {
                    setAbierta(!abierta);

                    if (!abierta && !automaticas) {
                        void bandeja?.refrescar();
                    }
                }}
            >
                <span aria-hidden="true">🔔</span>

                {!!cantidad && (
                    <span
                        className="alertas-contador"
                        aria-hidden="true"
                    >
                        {cantidad > 99 ? "99+" : cantidad}
                    </span>
                )}
            </button>

            {abierta && (
                <section
                    id="panel-alertas"
                    className="alertas-desplegable"
                    aria-label="Notificaciones recientes"
                >
                    <header>
                        <strong>Notificaciones</strong>

                        <button
                            type="button"
                            disabled={!cantidad || bandeja?.ocupado}
                            onClick={() => void bandeja?.leer()}
                        >
                            Marcar todas como leídas
                        </button>
                    </header>

                    <ListaAlertas resumen />

                    {seguimientoAcademico && (
                        <p>
                            <Link
                                to="/dashboard/conduccion/alertas"
                                onClick={() => setAbierta(false)}
                            >
                                Seguimiento académico
                            </Link>
                        </p>
                    )}

                    <Link
                        to="/dashboard/alertas"
                        onClick={() => setAbierta(false)}
                        aria-current={
                            ubicacion.pathname === "/dashboard/alertas"
                                ? "page"
                                : undefined
                        }
                    >
                        Ver todas las notificaciones
                    </Link>
                </section>
            )}
        </div>
    );
}