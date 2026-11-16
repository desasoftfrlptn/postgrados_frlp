import { Navigate, Outlet, useLocation } from 'react-router-dom';

import type { AuthRole } from './auth-context';
import { useAuth } from './useAuth';

export default function RequireRole({ roles }: { roles: AuthRole[] }) {
    const { session, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <p className="p-8 text-center" role="status">Verificando sesión...</p>;
    }
    if (!session) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    if (!roles.includes(session.user.role)) {
        return (
            <section className="m-8 rounded border border-red-300 bg-red-50 p-6 text-red-800" role="alert">
                Tu rol no tiene permisos para acceder a esta sección.
            </section>
        );
    }
    return <Outlet />;
}
