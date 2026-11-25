import { useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import ThemeToggle from "@/shared/components/ThemeToggle";
import { authApi } from "@/shared/api/endpoints";
import { isApiError } from "@/shared/api/client";

// Límites del backend (ActivarCuentaRequest y passwords.py)
const TOKEN_MIN = 20;
const TOKEN_MAX = 200;
const PASSWORD_MIN = 12;
const PASSWORD_MAX_BYTES = 72; // bcrypt no admite más; el schema permite 128 caracteres pero hash_contrasena rechaza > 72 bytes

function validarPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Usá al menos ${PASSWORD_MIN} caracteres.`;
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return "Es demasiado larga: el máximo es de 72 bytes y los acentos y símbolos ocupan más de uno.";
  }
  return null;
}

function Pantalla({ children }: { children: ReactNode }) {
  return (
    <div className="screen-shell relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="screen-card mx-auto max-w-md p-6">{children}</div>
    </div>
  );
}

export function ActivarCuenta() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get("token") ?? "";
  const tokenValido = token.length >= TOKEN_MIN && token.length <= TOKEN_MAX;

  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [errores, setErrores] = useState<{ password?: string; confirmacion?: string }>({});

  const activar = useMutation({ mutationFn: () => authApi.activarCuenta(token, password) });

  // 400 = invitación inexistente, vencida o ya usada, o cuenta no disponible: reintentar no sirve.
  const errorInvitacion =
    isApiError(activar.error) && activar.error.statusCode === 400 ? activar.error.message : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nuevos = {
      password: validarPassword(password) ?? undefined,
      confirmacion: password !== confirmacion ? "Las contraseñas no coinciden." : undefined,
    };
    setErrores(nuevos);
    if (nuevos.password || nuevos.confirmacion) return;
    activar.mutate();
  }

  if (activar.isSuccess) {
    return (
      <Pantalla>
        <div className="flex items-start gap-2 rounded-xl bg-semaforo-verde-soft p-4 text-sm text-semaforo-verde dark:bg-semaforo-verde-soft-dark">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          Tu cuenta quedó activada. Ya podés iniciar sesión con tu email y la contraseña que acabás de elegir.
        </div>
        <Button className="mt-6 w-full" onClick={() => navigate("/login", { replace: true })}>
          Ir a iniciar sesión
        </Button>
      </Pantalla>
    );
  }

  if (!tokenValido || errorInvitacion) {
    return (
      <Pantalla>
        <h1 className="mb-4 text-lg font-semibold text-ink">No pudimos activar tu cuenta</h1>
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-semaforo-amarillo/30 bg-semaforo-amarillo-soft p-4 text-sm text-semaforo-amarillo dark:bg-semaforo-amarillo-soft-dark"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            {errorInvitacion ?? "El enlace está incompleto o no es válido."} Pedile a la coordinación que
            te envíe uno nuevo.
          </span>
        </div>
        <Link
          to="/login"
          className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline"
        >
          Ir a iniciar sesión
        </Link>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <h1 className="mb-1 text-lg font-semibold text-ink">Activar tu cuenta</h1>
      <p className="mb-6 text-sm text-ink-secondary">
        Elegí la contraseña con la que vas a iniciar sesión.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Input
            label="Contraseña nueva"
            type={mostrar ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrores((prev) => ({ ...prev, password: undefined }));
            }}
            autoComplete="new-password"
            autoFocus
            required
            error={errores.password}
          />
          {!errores.password && (
            <p className="mt-1 text-xs text-ink-muted">Mínimo {PASSWORD_MIN} caracteres.</p>
          )}
        </div>

        <Input
          label="Repetir contraseña"
          type={mostrar ? "text" : "password"}
          value={confirmacion}
          onChange={(e) => {
            setConfirmacion(e.target.value);
            setErrores((prev) => ({ ...prev, confirmacion: undefined }));
          }}
          autoComplete="new-password"
          required
          error={errores.confirmacion}
        />

        <button
          type="button"
          onClick={() => setMostrar((v) => !v)}
          aria-pressed={mostrar}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          {mostrar ? "Ocultar contraseñas" : "Mostrar contraseñas"}
        </button>

        {activar.isError && (
          <p role="alert" className="text-sm text-semaforo-rojo">
            {activar.error.message}
          </p>
        )}

        <Button type="submit" className="w-full" isLoading={activar.isPending}>
          Activar cuenta
        </Button>
      </form>
    </Pantalla>
  );
}
