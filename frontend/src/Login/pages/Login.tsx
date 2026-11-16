import { useState, type SyntheticEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import Header from '../components/Header';
import Input from '../components/Input';
import Checkbox from '../components/Checkbox';
import {Button} from '../../shared/components/Button';
import VentanaEmergente from '../../shared/components/VentanaEmergente';
import { Spinner } from '@/shared/components/Spinner';
import { useAuth } from '@/shared/auth/authContext';
import { roleHome } from '@/shared/types/types';
import LogoFenix from '../../assets/LogoFenix.png';
import UtnLogo from '../../assets/UtnLogo.png';

export default function LoginScreen() {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [recordarme, setRecordarme] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { status, user, login } = useAuth();
  const location = useLocation();

  // Con sesión iniciada (ya había una, o se acaba de iniciar) se va a la página que se pedía
  // —RequireAuth la deja en location.state.from— o, si no, al inicio que corresponde al rol.
  if (status === "authenticated" && user) {
    const desde = (location.state as { from?: { pathname: string; search?: string } } | null)?.from;
    const destino = desde ? `${desde.pathname}${desde.search ?? ""}` : roleHome[user.rol];
    return <Navigate to={destino} replace />;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center gap-2 bg-paper text-ink-secondary">
        <Spinner size="sm" /> Verificando tu sesión…
      </div>
    );
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enviando) return;

    if (!usuario.trim() || !contrasena) {
      setError("Ingresá tu email y tu contraseña.");
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      await login(usuario.trim(), contrasena, { recordarme });
      // Sin navigate: al pasar status a "authenticated" este mismo componente redirige (ver arriba)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos iniciar sesión. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-paper">
      {/* Panel izquierdo: solo aparece en desktop */}
      <div className="hidden md:flex md:w-1/2 md:flex-col md:items-center md:bg-brand-700 md:p-12">
        <div className="flex flex-1 flex-col items-center justify-center">
          <img
            src={LogoFenix}
            alt="Fénix Posgrado"
            className="h-48 w-auto object-contain"
          />
          <p className="mt-0.5 text-xs font-light tracking-[0.2em] text-brand-100/70">
            SISTEMA DE POSTGRADO 2026
          </p>
        </div>

        <img
          src={UtnLogo}
          alt="UTN FRLP"
          className="mb-2 mt-10 h-4 w-auto max-w-[100px] object-contain opacity-70"
        />
      </div>

      {/* Panel derecho: sin cambios respecto a lo que ya tenías */}
      <div className="flex w-full flex-col md:w-1/2">
        <Header onBack={() => console.log("volver")} hideLogoOnDesktop />

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 px-6 pb-8 pt-8"
        >
          <Input
            icon={<Mail size={18} />}
            placeholder="Email"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />

          <Input
            icon={<Lock size={18} />}
            type="password"
            placeholder="Contraseña"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
          />

          {error && (
            <p role="alert" className="text-center text-sm font-medium text-semaforo-rojo">
              {error}
            </p>
          )}

          <div className="text-center">
            <Button type="submit" isLoading={enviando}>Ingresar</Button>
          </div>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setShowForgotModal(true);
            }}
            className="text-center text-sm font-medium text-ink-secondary transition-colors hover:text-brand-500"
          >
            ¿Olvidaste tu contraseña?
          </a>

          <Checkbox
            checked={recordarme}
            onChange={() => setRecordarme(!recordarme)}
            label="Recordarme"
          />
        </form>

        <VentanaEmergente
          isOpen={showForgotModal}
          onClose={() => setShowForgotModal(false)}
          title="Recuperar contraseña"
        >
          <p className="text-sm text-ink-secondary">
            Ingresá tu email y te enviamos un link para recuperar tu contraseña.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <Input
              icon={<Mail size={18} />}
              placeholder="Email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
            />
            <Button
              onClick={() => {
                console.log("recuperar contraseña para:", recoveryEmail);
                setShowForgotModal(false);
              }}
            >
              Enviar
            </Button>
          </div>
        </VentanaEmergente>
      </div>
    </div>
  );
}
