import { useCallback, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { shouldRetryQuery } from "@/shared/api/client";
import { authApi } from "@/shared/api/endpoints";
import { AuthContext, ME_KEY, type AuthContextValue, type AuthStatus } from "./authContext";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  setSession,
  subscribeSession,
} from "./authSession";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // La fuente de verdad de "¿hay sesión?" es el token, no la query: al hacer logout o
  // recibir un 401 el token desaparece y la UI pasa a "anonymous" de inmediato.
  const accessToken = useSyncExternalStore(subscribeSession, getAccessToken, () => null);

  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: authApi.me,
    enabled: accessToken !== null,
    staleTime: 5 * 60_000,
    retry: shouldRetryQuery,
  });

  const status: AuthStatus =
    accessToken === null
      ? "anonymous"
      : me.data
        ? "authenticated"
        : me.isError
          ? "error"
          : "loading";

  const login = useCallback<AuthContextValue["login"]>(
    async (email, password, options) => {
      const tokens = await authApi.login(email, password);
      queryClient.clear(); // evita mostrar datos cacheados de un usuario anterior
      setSession(tokens, options);
      try {
        return await queryClient.fetchQuery({ queryKey: ME_KEY, queryFn: authApi.me, staleTime: 0 });
      } catch (error) {
        clearSession();
        throw error;
      }
    },
    [queryClient],
  );

  const logout = useCallback<AuthContextValue["logout"]>(async () => {
    const refreshToken = getRefreshToken();
    clearSession();
    queryClient.clear();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken); // revoca en el servidor; si falla igual ya salimos
      } catch {
        /* sin acción */
      }
    }
  }, [queryClient]);

  const reloadUser = useCallback(() => {
    void me.refetch();
  }, [me]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user: me.data ?? null, login, logout, reloadUser }),
    [status, me.data, login, logout, reloadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
