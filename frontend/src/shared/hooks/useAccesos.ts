import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accesosApi, type CrearEnlaceRequest } from "@/shared/api/endpoints";

// Misma key que usa el guard RequireAcceso: comparten caché.
export const ACCESO_SESION_KEY = ["acceso", "sesion"] as const;

/* ───────────── Coordinador: gestión de enlaces temporales ───────────── */

// POST /accesos. Devuelve { id, tipo, expira_at, url } para compartir con el aspirante.
export function useCrearEnlace() {
  return useMutation({
    mutationFn: (datos: CrearEnlaceRequest) => accesosApi.crearEnlace(datos),
  });
}

// POST /accesos/:id/revocar
export function useRevocarEnlace() {
  return useMutation({
    mutationFn: (enlaceId: string) => accesosApi.revocar(enlaceId),
  });
}

/* ───────────── Aspirante: ingreso con enlace ───────────── */

// POST /accesos/validar (público, con rate limit): comprueba el enlace sin crear sesión.
export function useValidarEnlace() {
  return useMutation({
    mutationFn: (token: string) => accesosApi.validar(token),
  });
}

// POST /accesos/intercambiar: canjea el token por la cookie de sesión del aspirante.
export function useIntercambiarEnlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => accesosApi.intercambiar(token),
    onSuccess: ({ tipo }) => {
      // Que el guard RequireAcceso vea la sesión nueva en vez de un 401 cacheado
      queryClient.setQueryData(ACCESO_SESION_KEY, { tipo });
      // Y que no se vean datos cacheados de otro aspirante que usó este navegador
      queryClient.removeQueries({ queryKey: ["consulta-estado"] });
    },
  });
}

// GET /accesos/sesion: ¿hay cookie de aspirante vigente y de qué tipo?
export function useSesionAcceso() {
  return useQuery({
    queryKey: ACCESO_SESION_KEY,
    queryFn: accesosApi.sesion,
    retry: false,
    staleTime: 60_000,
  });
}

// DELETE /accesos/sesion
export function useCerrarSesionAcceso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accesosApi.cerrarSesion,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ACCESO_SESION_KEY });
      queryClient.removeQueries({ queryKey: ["consulta-estado"] });
    },
  });
}
