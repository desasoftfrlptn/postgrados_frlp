// Componente reutilizable para mostrar y validar Google reCAPTCHA.

import { useEffect, useRef } from "react";

interface RecaptchaApi {
  render: (
    elemento: HTMLElement,
    opciones: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    }
  ) => number;

  reset: (widgetId?: number) => void;

  ready: (callback: () => void) => void;
}

declare global {
  interface Window {
    grecaptcha?: RecaptchaApi;
  }
}

interface CaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
}

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export default function Captcha({
  onVerify,
  onError,
}: CaptchaProps) {
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) {
      console.error("Falta configurar VITE_RECAPTCHA_SITE_KEY");
      onError?.();
      return;
    }

    const renderizarCaptcha = () => {
      if (!window.grecaptcha || !captchaRef.current) {
        return;
      }

      if (widgetIdRef.current !== null) {
        return;
      }

      window.grecaptcha.ready(() => {
        if (!captchaRef.current || widgetIdRef.current !== null) {
          return;
        }

        widgetIdRef.current = window.grecaptcha!.render(
          captchaRef.current,
          {
            sitekey: RECAPTCHA_SITE_KEY,

            callback: (token: string) => {
              onVerify(token);
            },

            "expired-callback": () => {
              onVerify("");
            },

            "error-callback": () => {
              onVerify("");
              onError?.();
            },
          }
        );
      });
    };

    const scriptExistente = document.getElementById(
      "recaptcha-script"
    ) as HTMLScriptElement | null;

    if (scriptExistente) {
      if (window.grecaptcha) {
        renderizarCaptcha();
      } else {
        scriptExistente.addEventListener(
          "load",
          renderizarCaptcha
        );
      }

      return () => {
        scriptExistente.removeEventListener(
          "load",
          renderizarCaptcha
        );
      };
    }

    const script = document.createElement("script");

    script.id = "recaptcha-script";
    script.src =
      "https://www.google.com/recaptcha/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = renderizarCaptcha;

    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [onVerify, onError]);

  return (
    <div
      className="sesion-captcha"
      ref={captchaRef}
      aria-label="Verificación CAPTCHA"
    />
  );
}