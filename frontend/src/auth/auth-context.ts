import { createContext } from 'react';

export type AuthRole = 'COORDINADOR' | 'CPR' | 'ADMIN';

export type AuthUser = {
    id: string;
    email: string;
    role: AuthRole;
};

export type AuthSession = {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    user: AuthUser;
};

export type AuthContextValue = {
    session: AuthSession | null;
    isLoading: boolean;
    authError: string | null;
    login: (email: string, password: string) => Promise<AuthSession>;
    logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
