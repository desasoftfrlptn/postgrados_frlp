import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';

export default function AuthLanding() {
    const { logout, session } = useAuth();
    const navigate = useNavigate();

    return (
        <main className="mx-auto my-12 w-full max-w-xl px-4">
            <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="mb-2 text-2xl font-bold">Sesión iniciada</h1>
                <p className="text-slate-700">
                    {session?.user.email} · {session?.user.role}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                    {session?.user.role === 'COORDINADOR' && (
                        <Link
                            to="/coordinador"
                            className="rounded bg-[#2a3441] px-4 py-2 font-semibold text-white hover:bg-slate-700"
                        >
                            Ir al panel de coordinación
                        </Link>
                    )}
                    {session?.user.role === 'CPR' && (
                        <Link
                            to="/cpr/trabajos-finales"
                            className="rounded bg-[#2a3441] px-4 py-2 font-semibold text-white hover:bg-slate-700"
                        >
                            Ir a Trabajos Finales (CPR)
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={() => void logout().then(() => navigate('/inscripcion', { replace: true }))}
                        className="rounded border border-slate-400 px-4 py-2 font-semibold hover:bg-slate-50"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </section>
        </main>
    );
}
