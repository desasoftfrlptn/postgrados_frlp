// Proveedor global para manejar la sesión del usuario.

import { useEffect, useState } from "react";

import { api, } from "../../shared/api/client";

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
  const [user, setUser] =
    useState<AuthState | null>(
      null
    );

    useEffect(() => {
  const manejarSesionInvalidada = (event: Event) => {

  const tokenRechazado = (event as CustomEvent<string>).detail;

  setUser((usuarioActual) => {
    if (usuarioActual?.token === tokenRechazado) {
      return null;
    }

    return usuarioActual;
  });
};

  window.addEventListener(
    "sesion-invalidada",
    manejarSesionInvalidada
  );

  return () => {
    window.removeEventListener(
      "sesion-invalidada",
      manejarSesionInvalidada
    );
  };
}, []);

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

    const respuesta = await api.post<LoginRespuestaAPI>(
      "/autenticacion/login",
      {
        correo_electronico: email.trim(),
        contrasena: password,
      }
    );

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


  const confirmarCambioContrasena =
    () => {
      setUser(
        (usuarioActual) => {
          if (!usuarioActual) {
            return null;
          }

          return {
            ...usuarioActual,
            debeCambiarContrasena:
              false,
          };
        }
      );
    };


  const logout = () => {
    setUser(null);
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        confirmarCambioContrasena,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}