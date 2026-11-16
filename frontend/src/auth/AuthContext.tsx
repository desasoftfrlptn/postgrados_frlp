import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { AuthContext, type AuthRole, type AuthSession, type AuthUser } from './auth-context';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const SESSION_STORAGE_KEY = 'postgrados-auth-session';
const refreshRequests = new Map<string, Promise<AuthSession>>();

function isAuthRole(value: unknown): value is AuthRole {
    return value === 'COORDINADOR' || value === 'CPR' || value === 'ADMIN';
}

function isAuthUser(value: unknown): value is AuthUser {
    return (
        typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        typeof value.id === 'string' &&
        'email' in value &&
        typeof value.email === 'string' &&
        'role' in value &&
        isAuthRole(value.role)
    );
}

function isAuthSession(value: unknown): value is AuthSession {
    return (
        typeof value === 'object' &&
        value !== null &&
        'accessToken' in value &&
        typeof value.accessToken === 'string' &&
        'refreshToken' in value &&
        typeof value.refreshToken === 'string' &&
        'expiresAt' in value &&
        typeof value.expiresAt === 'number' &&
        'user' in value &&
        isAuthUser(value.user)
    );
}

function readSession(): AuthSession | null {
    try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (!stored) {
            return null;
        }

        const parsed: unknown = JSON.parse(stored);
        if (!isAuthSession(parsed) || parsed.expiresAt <= Date.now()) {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function getErrorMessage(payload: unknown): string {
    if (typeof payload === 'object' && payload !== null && 'detail' in payload && typeof payload.detail === 'string') {
        return payload.detail;
    }
    return 'No se pudo iniciar sesión. Verificá tus credenciales e intentá nuevamente.';
}

function isLoginResponse(value: unknown): value is {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: AuthUser;
} {
    return (
        typeof value === 'object' &&
        value !== null &&
        'access_token' in value &&
        typeof value.access_token === 'string' &&
        'refresh_token' in value &&
        typeof value.refresh_token === 'string' &&
        'expires_in' in value &&
        typeof value.expires_in === 'number' &&
        'user' in value &&
        isAuthUser(value.user)
    );
}

async function renewSession(session: AuthSession): Promise<AuthSession> {
    const pending = refreshRequests.get(session.refreshToken);
    if (pending) {
        return pending;
    }

    const request = (async () => {
        const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: session.refreshToken }),
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
            throw new Error(getErrorMessage(payload));
        }
        if (!isLoginResponse(payload)) {
            throw new Error('El servidor respondió con un formato de renovación inválido.');
        }

        const renewed: AuthSession = {
            accessToken: payload.access_token,
            refreshToken: payload.refresh_token,
            expiresAt: Date.now() + payload.expires_in * 1000,
            user: payload.user,
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(renewed));
        return renewed;
    })();
    refreshRequests.set(session.refreshToken, request);
    try {
        return await request;
    } finally {
        refreshRequests.delete(session.refreshToken);
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<AuthSession | null>(readSession);
    const [isLoading, setIsLoading] = useState(() => readSession() !== null);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        const stored = readSession();
        if (!stored) {
            return;
        }

        let cancelled = false;
        const validateSession = async () => {
            try {
                let activeSession = stored;
                let response = await fetch(`${API_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${activeSession.accessToken}` },
                });
                if (response.status === 401) {
                    activeSession = await renewSession(activeSession);
                    response = await fetch(`${API_URL}/auth/me`, {
                        headers: { Authorization: `Bearer ${activeSession.accessToken}` },
                    });
                }
                if (!response.ok) {
                    throw new Error('No se pudo validar la sesión. Iniciá sesión nuevamente.');
                }

                const user: unknown = await response.json();
                if (!isAuthUser(user)) {
                    throw new Error('El servidor respondió con una sesión inválida.');
                }
                const validatedSession = { ...activeSession, user };
                sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(validatedSession));
                if (!cancelled) {
                    setSession(validatedSession);
                }
            } catch (error) {
                try {
                    sessionStorage.removeItem(SESSION_STORAGE_KEY);
                } catch {
                    setAuthError('No se pudo limpiar la sesión local.');
                }
                if (!cancelled) {
                    setSession(null);
                    setAuthError(error instanceof Error ? error.message : 'No se pudo validar la sesión.');
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void validateSession();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!session) {
            return;
        }

        const delay = Math.max(0, session.expiresAt - Date.now() - 30_000);
        const timeout = window.setTimeout(() => {
            void renewSession(session).then((renewed) => {
                setSession(renewed);
                setAuthError(null);
            }).catch((error: unknown) => {
                try {
                    sessionStorage.removeItem(SESSION_STORAGE_KEY);
                } catch {
                    setAuthError('No se pudo limpiar la sesión local.');
                }
                setSession(null);
                setAuthError(error instanceof Error ? error.message : 'La sesión venció; iniciá sesión nuevamente.');
            });
        }, delay);
        return () => window.clearTimeout(timeout);
    }, [session]);

    const login = useCallback(async (email: string, password: string) => {
        setAuthError(null);
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
            });
            const payload: unknown = await response.json();
            if (!response.ok) {
                throw new Error(getErrorMessage(payload));
            }
            if (!isLoginResponse(payload)) {
                throw new Error('El servidor respondió con un formato de inicio de sesión inválido.');
            }

            const nextSession: AuthSession = {
                accessToken: payload.access_token,
                refreshToken: payload.refresh_token,
                expiresAt: Date.now() + payload.expires_in * 1000,
                user: payload.user,
            };
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
            setSession(nextSession);
            return nextSession;
        } catch (error) {
            const message = error instanceof TypeError
                ? 'No se pudo conectar con el servidor de autenticación.'
                : error instanceof Error
                    ? error.message
                    : 'No se pudo iniciar sesión.';
            setAuthError(message);
            throw new Error(message, { cause: error });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        const currentSession = session;
        try {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
        } catch {
            setAuthError('No se pudo limpiar la sesión local; cerrá esta pestaña para finalizarla.');
        }
        setSession(null);
        if (!currentSession) {
            return;
        }

        let remoteLogoutFailed: boolean;
        try {
            const response = await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: currentSession.refreshToken }),
            });
            remoteLogoutFailed = !response.ok;
        } catch {
            remoteLogoutFailed = true;
        }
        if (remoteLogoutFailed) {
            setAuthError('Se cerró la sesión local, pero no se pudo revocar el token remoto.');
        }
    }, [session]);

    const value = useMemo(
        () => ({ session, isLoading, authError, login, logout }),
        [session, isLoading, authError, login, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
