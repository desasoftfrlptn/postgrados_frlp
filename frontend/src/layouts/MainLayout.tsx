import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export default function MainLayout() {
    const { authError, logout, session } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col bg-white font-sans text-slate-800">
            <nav className="bg-blue-900 text-white p-4 flex gap-4 shadow-md">
                <Link to="/inscripcion" className="hover:underline">Formulario de inscripción</Link>
                {session?.user.role === 'COORDINADOR' && (
                    <Link to="/coordinador" className="hover:underline">Gestión de coordinación</Link>
                )}
                {session?.user.role === 'CPR' && (
                    <Link to="/cpr/trabajos-finales" className="hover:underline">Trabajos Finales (CPR)</Link>
                )}
            </nav>
            <header className="flex justify-between items-center p-4 border-b-2 border-slate-800">
                <Link to="/" className="w-12 h-12 border-2 border-slate-800 flex flex-col items-center justify-center font-bold text-xs leading-none hover:bg-slate-50 transition-colors">
                    <span>UTN</span>
                </Link>

                <div className="flex gap-4">
                    {session ? (
                        <>
                            <span className="hidden self-center text-sm sm:inline">{session.user.email}</span>
                            <button
                                type="button"
                                onClick={() => void logout().then(() => navigate('/inscripcion', { replace: true }))}
                                className="rounded border-2 border-slate-800 px-4 py-2 font-semibold transition-colors hover:bg-slate-50"
                            >
                                Cerrar sesión
                            </button>
                        </>
                    ) : (
                        <Link to="/login" className="rounded bg-[#2a3441] px-4 py-2 font-semibold text-white transition-colors hover:bg-slate-700">
                            Iniciar sesión
                        </Link>
                    )}
                </div>
            </header>

            {authError && location.pathname !== '/login' && (
                <p className="mx-auto mt-4 w-full max-w-3xl rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
                    {authError}
                </p>
            )}

            <div className="flex-grow flex flex-col">
                <Outlet />
            </div>

        </div>
    );
}