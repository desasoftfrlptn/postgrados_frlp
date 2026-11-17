import { useCallback, useMemo } from 'react';

import { useAuth } from '../../auth/useAuth';
import { crearClienteApi } from './cliente';

export async function extraerErrorApi(respuesta: Response, fallback = 'Ocurrió un error al procesar la solicitud.'): Promise<string> {
    try {
        const cuerpo: unknown = await respuesta.json();
        if (typeof cuerpo === 'object' && cuerpo !== null && 'detail' in cuerpo) {
            const detalle = (cuerpo as { detail: unknown }).detail;
            if (typeof detalle === 'string' && detalle.trim()) {
                return detalle;
            }
            if (Array.isArray(detalle) && detalle.length > 0) {
                const mensajes = detalle
                    .map((item) => (typeof item === 'object' && item !== null && 'msg' in item ? String((item as { msg: unknown }).msg) : null))
                    .filter((msg): msg is string => Boolean(msg));
                if (mensajes.length > 0) {
                    return mensajes.join(' · ');
                }
            }
        }
    } catch {
        // Ignorar errores de parseo JSON
    }
    return fallback;
}

export function guardarBlobComoArchivo(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
}

export function useApiClient() {
    const { session, logout } = useAuth();
    const accessToken = session?.accessToken ?? null;

    const cliente = useMemo(
        () =>
            crearClienteApi({
                autenticacion: {
                    obtenerTokenAcceso: () => accessToken,
                    renovarTokenAcceso: async () => null,
                    alNoAutorizado: () => {
                        void logout();
                    },
                },
            }),
        [accessToken, logout],
    );

    const descargarArchivo = useCallback(
        async (ruta: string, nombreArchivoPorDefecto: string, headersExtra?: HeadersInit): Promise<void> => {
            const respuesta = await cliente.solicitar(ruta, { headers: headersExtra });
            if (!respuesta.ok) {
                throw new Error(await extraerErrorApi(respuesta, 'No se pudo descargar el archivo.'));
            }
            const blob = await respuesta.blob();
            const disposicion = respuesta.headers.get('Content-Disposition');
            const coincidencia = disposicion?.match(/filename="?([^"]+)"?/i);
            const nombreArchivo = coincidencia?.[1] || nombreArchivoPorDefecto;
            guardarBlobComoArchivo(blob, nombreArchivo);
        },
        [cliente],
    );

    return {
        solicitar: cliente.solicitar,
        descargarArchivo,
    };
}
