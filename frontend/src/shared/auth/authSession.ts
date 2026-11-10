/**
 * Sesión del staff (access + refresh token).
 *  - "Recordarme" tildado   → localStorage (sobrevive al cierre del navegador).
 *  - "Recordarme" sin tildar → sessionStorage (se pierde al cerrar la pestaña).
 * Es un store externo (se lee con useSyncExternalStore), así que cualquier cambio
 * —login, refresh automático, logout, 401, o un cambio en otra pestaña— se refleja en la UI.
 *
 * Trade-off: ambos storages son legibles por cualquier script de la página (XSS). Es lo más
 * simple dado que el backend devuelve los tokens en el body; la alternativa segura sería
 * que el backend los entregue en cookies HttpOnly.
 */
import type { QueryClient } from "@tanstack/react-query";
import { configureApiClient, type TokenPair } from "@/shared/api/client";

const STORAGE_KEY = "fenix.session";

interface Session {
  access: string;
  refresh: string;
}

type Almacen = "local" | "session";

function almacen(tipo: Almacen): Storage | null {
  try {
    return tipo === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null; // storage bloqueado (modo privado estricto, políticas del navegador)
  }
}

function leer(tipo: Almacen): Session | null {
  try {
    const raw = almacen(tipo)?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    return typeof parsed.access === "string" && typeof parsed.refresh === "string"
      ? { access: parsed.access, refresh: parsed.refresh }
      : null;
  } catch {
    return null;
  }
}

// ¿Dónde está guardada la sesión? Los refresh automáticos deben escribir en el mismo lugar.
let persistente = true;
let session: Session | null = (() => {
  const enLocal = leer("local");
  if (enLocal) return enLocal;
  const enSesion = leer("session");
  if (enSesion) persistente = false;
  return enSesion;
})();

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function write(next: Session | null, persistir: boolean) {
  session = next;
  persistente = persistir;
  try {
    almacen(persistir ? "session" : "local")?.removeItem(STORAGE_KEY); // nunca en los dos a la vez
    const destino = almacen(persistir ? "local" : "session");
    if (next) destino?.setItem(STORAGE_KEY, JSON.stringify(next));
    else destino?.removeItem(STORAGE_KEY);
  } catch {
    /* storage no disponible: la sesión vive solo en memoria */
  }
  notify();
}

// Otra pestaña hizo login/logout/refresh (solo aplica a localStorage; sessionStorage es por pestaña).
// Importante: el refresh token rota, así que esta pestaña debe tomar el nuevo para no usar uno ya revocado.
window.addEventListener("storage", (event) => {
  if (persistente && (event.key === STORAGE_KEY || event.key === null)) {
    session = leer("local");
    notify();
  }
});

export const getAccessToken = () => session?.access ?? null;
export const getRefreshToken = () => session?.refresh ?? null;

/** `recordarme` solo se indica en el login; los refresh automáticos conservan la elección. */
export function setSession(tokens: TokenPair, opciones?: { recordarme?: boolean }) {
  write(
    { access: tokens.access_token, refresh: tokens.refresh_token },
    opciones?.recordarme ?? persistente,
  );
}

export function clearSession() {
  write(null, persistente);
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Conecta el cliente HTTP con la sesión. Llamar UNA vez en main.tsx, antes de renderizar
 * (no en un useEffect: los efectos de los hijos corren antes y sus queries saldrían sin token).
 */
export function setupApiAuth(queryClient: QueryClient) {
  configureApiClient({
    getToken: getAccessToken,
    getRefreshToken,
    onTokensRefreshed: setSession,
    onUnauthorized: () => {
      // Idempotente: varios requests concurrentes pueden fallar con 401 a la vez.
      if (session === null) return;
      clearSession();
      queryClient.clear();
    },
  });
}
