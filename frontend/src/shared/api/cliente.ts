export type AutenticacionClienteApi = {
    obtenerTokenAcceso: () => string | null;
    renovarTokenAcceso: () => Promise<string | null>;
    alNoAutorizado: () => void;
};

export type ClienteApi = {
    solicitar: (ruta: string, opciones?: RequestInit) => Promise<Response>;
};

type OpcionesClienteApi = {
    urlBase?: string;
    autenticacion: AutenticacionClienteApi;
    solicitarHttp?: typeof fetch;
};

const URL_API_PREDETERMINADA = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export function crearClienteApi({
    urlBase = URL_API_PREDETERMINADA,
    autenticacion,
    solicitarHttp = fetch,
}: OpcionesClienteApi): ClienteApi {
    const solicitar = async (ruta: string, opciones: RequestInit = {}): Promise<Response> => {
        const url = `${urlBase.replace(/\/$/, '')}/${ruta.replace(/^\//, '')}`;
        const enviar = (tokenAcceso: string | null) => {
            const headers = new Headers(opciones.headers);
            headers.set('Accept', 'application/json');
            if (tokenAcceso) {
                headers.set('Authorization', `Bearer ${tokenAcceso}`);
            } else {
                headers.delete('Authorization');
            }
            return solicitarHttp(url, { ...opciones, headers });
        };

        const tokenAcceso = autenticacion.obtenerTokenAcceso();
        const respuesta = await enviar(tokenAcceso);
        if (respuesta.status !== 401 || !tokenAcceso) {
            return respuesta;
        }

        let tokenRenovado: string | null;
        try {
            tokenRenovado = await autenticacion.renovarTokenAcceso();
        } catch (excepcion) {
            autenticacion.alNoAutorizado();
            throw excepcion;
        }
        if (!tokenRenovado) {
            autenticacion.alNoAutorizado();
            return respuesta;
        }

        const respuestaReintentada = await enviar(tokenRenovado);
        if (respuestaReintentada.status === 401) {
            autenticacion.alNoAutorizado();
        }
        return respuestaReintentada;
    };

    return { solicitar };
}
