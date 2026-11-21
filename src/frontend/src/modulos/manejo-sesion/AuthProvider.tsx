// Proveedor global para manejar la sesión del usuario.

import { useEffect, useRef, useState } from "react";

import { api } from "../../shared/api/client";

import {
  AuthContext,
  type AuthState,
} from "./useAuth";

import type {
  Rol,
} from "../../shared/tipos";


interface LoginRespuestaAPI {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  correo_electronico: string;
  tipo_usuario: Rol;
  token: string;
  debe_cambiar_contrasena: boolean;
}


export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const intentoLogin = useRef(0);
  const [motivoCierre, setMotivoCierre] = useState("");
  const [user, setUser] =
    useState<AuthState | null>(
      null
    );

  useEffect(() => {
    const manejarSesionInvalidada = (event: Event) => {
      const tokenRechazado = (event as CustomEvent<string>).detail;
      if (user?.token !== tokenRechazado) return;
      setMotivoCierre("Tu sesión ya no es válida. Volvé a iniciar sesión.");
      setUser(null);
    };
    window.addEventListener("sesion-invalidada", manejarSesionInvalidada);
    return () => window.removeEventListener("sesion-invalidada", manejarSesionInvalidada);
  }, [user?.token]);

  // El servidor valida la firma; este reloj solo anticipa el cierre visual.
  useEffect(() => {
    if (!user) return;
    let exp: unknown;
    try {
      const payload = user.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      exp = JSON.parse(atob(payload)).exp;
    } catch {
      return;
    }
    if (typeof exp !== "number" || !Number.isFinite(exp)) return;
    const token = user.token;
    const verificar = () => {
      if (Date.now() >= (exp as number) * 1000) {
        setMotivoCierre("Tu sesión venció. Volvé a iniciar sesión.");
        setUser(actual => actual?.token === token ? null : actual);
      }
    };
    const temporizador = window.setTimeout(verificar, Math.max(0, exp * 1000 - Date.now()));
    window.addEventListener("focus", verificar);
    return () => {
      window.clearTimeout(temporizador);
      window.removeEventListener("focus", verificar);
    };
  }, [user]);

  const login = async (
    email: string,
    password: string
  ) => {
    if (
      !email.trim()
      || !password.trim()
    ) {
      throw new Error(
        "El email y la contraseña son obligatorios"
      );
    }

    const intento = ++intentoLogin.current;
    const respuesta = await api.post<LoginRespuestaAPI>(
      "/autenticacion/login",
      {
        correo_electronico: email.trim(),
        contrasena: password,
      }
    );

    if (intento !== intentoLogin.current) {
      throw new Error("El inicio de sesión fue cancelado.");
    }
    if (respuesta.tipo_usuario === "ASPIRANTE") {
      throw new Error("Los aspirantes realizan su seguimiento desde el sitio público.");
    }

    setMotivoCierre("");
    const usuario: AuthState = {
      id: respuesta.id,
      email: respuesta.correo_electronico,
      nombre: respuesta.nombre,
      apellido: respuesta.apellido,
      rol: respuesta.tipo_usuario,
      token: respuesta.token,
      dni: respuesta.dni,
      debeCambiarContrasena: respuesta.debe_cambiar_contrasena,
    };


    setUser(
      usuario
    );

    return usuario;
  };


  const confirmarCambioContrasena = () => {
    setUser((usuarioActual) => {
      if (!usuarioActual) return null;
      return { ...usuarioActual, debeCambiarContrasena: false };
    });
  };

  const logout = () => {
    intentoLogin.current += 1;
    setMotivoCierre("");
    setUser(null);
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        confirmarCambioContrasena,
        motivoCierre,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
