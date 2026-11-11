import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/shared/components/Spinner";
import { Button } from "@/shared/components/Button";
import { isApiError } from "@/shared/api/client";
import { accesosApi, type TipoEnlace } from "@/shared/api/endpoints";
import type { Rol } from "@/shared/types/types";
import { useAuth } from "./authContext";

function PantallaCarga({ texto }: { texto: string }) {
  return (
    <div className="screen-shell relative flex items-center gap-2 p-6 text-ink-secondary">
      <Spinner size="sm" /> {texto}
    </div>
  );
}

function PantallaError({ texto, onReintentar }: { texto: string; onReintentar: () => void }) {
  return (
    <div className="screen-shell relative">
      <div className="screen-card mx-auto max-w-md space-y-4 p-6">
        <p role="alert" className="text-sm text-ink">
          {texto}
        </p>
        <Button className="w-full" onClick={onReintentar}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}

/**
 * Guard para el personal (login con email y contraseña).
 *
 *   <Route element={<RequireAuth />}>                               // cualquier usuario con sesión
 *     <Route element={<RequireAuth roles={["coordinador"]} />}>     // solo ese rol
 *
 * Solo controla la navegación: la seguridad real la aplica el backend con
 * require_role(). Los roles de acá deben reflejar los de cada router.
 */
export function RequireAuth({
  roles,
  loginPath = "/login",
  forbiddenPath = "/no-autorizado",
}: {
  roles?: readonly Rol[];
  loginPath?: string;
  forbiddenPath?: string;
}) {
  const { status, user, reloadUser } = useAuth();
  const location = useLocation();

  if (status === "loading") return <PantallaCarga texto="Verificando tu sesión…" />;

  if (status === "error") {
    return (
      <PantallaError
        texto="No pudimos verificar tu sesión. Revisá tu conexión y probá de nuevo."
        onReintentar={reloadUser}
      />
    );
  }

  if (status === "anonymous" || !user) {
    // `from` permite volver a la página pedida después de iniciar sesión
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.rol)) {
    return <Navigate to={forbiddenPath} replace />;
  }

  return <Outlet />;
}

/**
 * Guard para aspirantes: no hay login, se entra con un enlace temporal que deja una
 * cookie HttpOnly. Consulta GET /accesos/sesion y exige el tipo de enlace correcto.
 *
 *   <Route element={<RequireAcceso tipo="SEGUIMIENTO" />}>
 */
export function RequireAcceso({
  tipo,
  invalidPath = "/acceso-invalido",
}: {
  tipo: TipoEnlace;
  invalidPath?: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const token = new URLSearchParams(location.search).get("token");

  const sesion = useQuery({
    // No incluir el token en la queryKey para evitar almacenarlo en la caché.
    queryKey: ["acceso", "sesion", Boolean(token)],

    queryFn: async () => {
      // Si se ingresó mediante un enlace, primero se intercambia.
      if (token) {
        await accesosApi.intercambiar(token);
      }

      // Se consulta la sesión establecida mediante la cookie HttpOnly.
      return accesosApi.sesion();
    },

    retry: false,
    staleTime: token ? 0 : 60_000,
  });

  // Una vez intercambiado el enlace y verificada la sesión,
  // se elimina el token de la URL.
  useEffect(() => {
    if (token && sesion.isSuccess) {
      const params = new URLSearchParams(location.search);
      params.delete("token");

      const search = params.toString();

      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : "",
        },
        { replace: true }
      );
    }
  }, [token, sesion.isSuccess, location.pathname, location.search, navigate]);

  if (sesion.isPending) {
    return (
      <PantallaCarga texto="Verificando tu enlace..." />
    );
  }

  if (sesion.isError) {
    if (isApiError(sesion.error) && sesion.error.isUnauthorized) {
      return <Navigate to={invalidPath} replace />;
    }

    return (
      <PantallaError
        texto="No pudimos verificar tu enlace. Probá de nuevo en unos minutos."
        onReintentar={() => void sesion.refetch()}
      />
    );
  }

  if (sesion.data.tipo !== tipo) {
    return <Navigate to={invalidPath} replace />;
  }

  return <Outlet />;
}
