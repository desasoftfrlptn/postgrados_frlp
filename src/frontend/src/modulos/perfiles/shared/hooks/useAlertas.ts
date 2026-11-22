import { createContext, useContext } from "react";
import type { BandejaAlertas } from "../../../../shared/api/alertas";
export interface EstadoAlertas {
  datos: BandejaAlertas | null; error: string; ocupado: boolean;
  refrescar: () => Promise<void>; leer: (id?: string) => Promise<void>;
}
export const AlertasContext = createContext<EstadoAlertas | null>(null);
export function useAlertas() { return useContext(AlertasContext); }
