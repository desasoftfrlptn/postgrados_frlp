import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';

type LoginLocationState = {
    from?: {
        pathname?: string;
    };
};

export default function Login() {
    const { authError, isLoading, login } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitError(null);
        try {
            const session = await login(email, password);
            const requestedPath = (location.state as LoginLocationState | null)?.from?.pathname;
            const destination = session.user.role === 'COORDINADOR'
                ? requestedPath?.startsWith('/coordinador') ? requestedPath : '/coordinador'
                : '/acceso';
            navigate(destination, { replace: true });
        } catch {
            setSubmitError('No se pudo iniciar sesión con esos datos.');
        }
    };

    return (
        <main className="mx-auto my-12 w-full max-w-md px-4">
            <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="mb-2 text-2xl font-bold">Iniciar sesión</h1>
                <p className="mb-6 text-sm text-slate-600">Acceso para coordinación, CPR y administración.</p>
                {(authError || submitError) && (
                    <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="alert">
                        {submitError ?? authError}
                    </p>
                )}
                <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                    <div>
                        <label className="mb-1 block text-sm font-semibold" htmlFor="login-email">Email</label>
                        <input
                            id="login-email"
                            type="email"
                            autoComplete="username"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded border border-slate-300 p-2"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-semibold" htmlFor="login-password">Contraseña</label>
                        <input
                            id="login-password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="w-full rounded border border-slate-300 p-2"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded bg-slate-800 px-4 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                    >
                        {isLoading ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>
            </section>
        </main>
    );
}
