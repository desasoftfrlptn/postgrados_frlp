import { createContext } from "react";

import type { User } from "../types/types.ts";

export const UserContext = createContext({
  nombre: "Usuario",
  rol: "aspirante",
  email: "",
  password_hash: "",
  password_plano: "",
  activo: true
} as User);