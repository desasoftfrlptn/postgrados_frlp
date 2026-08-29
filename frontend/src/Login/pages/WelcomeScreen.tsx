import { PenLine, ClipboardList } from 'lucide-react';
import { Button } from '../../shared/components/Button';
import Header from '../components/Header';
import LogoFenix from '../../assets/LogoFenix.png';
import UtnLogo from '../../assets/UtnLogo.png';

export default function WelcomeScreen() {
  return (
    <div className="flex min-h-screen w-full bg-paper">
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

      <div className="flex w-full flex-col md:w-1/2">
        <Header onBack={() => console.log('volver')} hideLogoOnDesktop />

        <div className="flex flex-1 flex-col justify-center gap-4 px-6 pb-8 pt-2">
          <h1 className="text-center">Bienvenido Usuario</h1>

          <Button
            icon={PenLine}
            onClick={() => console.log('Nueva inscripción')}
          >
            Nueva inscripción
          </Button>

          <Button
            icon={ClipboardList}
            onClick={() => console.log('Consultar Estado')}
          >
            Consultar Estado
          </Button>
        </div>
      </div>
    </div>
  );
}