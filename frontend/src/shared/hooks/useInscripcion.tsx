import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import type {
  DatosPersonales,
  DatosAcademicos,
  DatosDocumentos,
  CrearLegajoRequest,
  Legajo,
  TipoDocumento,
} from "@/shared/types/types";

export interface InscripcionPayload {
  cohorte_id?: string;
  datosPersonales: DatosPersonales;
  datosAcademicos: DatosAcademicos;
  datosDocumentos: DatosDocumentos;
}

const DOCUMENTO_ID_A_TIPO: Record<string, TipoDocumento> = {
  "formulario-preinscripcion": "FORM_INSCRIPCION",
  "partida-nacimiento": "PARTIDA",
  "cuit-cuil": "CUIT_CUIL",
  "titulo-grado": "TITULO_GRADO",
  "titulo-posgrado": "TITULO_POSGRADO",
  dni: "DNI",
};

function mapearACrearLegajoRequest(
  payload: InscripcionPayload,
): CrearLegajoRequest & { cohorte_id?: string } {
  return {
    ...(payload.cohorte_id
      ? { cohorte_id: payload.cohorte_id }
      : {}),
    apellido: payload.datosPersonales.apellido,
    nombre: payload.datosPersonales.nombre,
    nacionalidad: payload.datosPersonales.nacionalidad,
    dni: payload.datosPersonales.documento,
    telefono_movil: payload.datosPersonales.telefonoMovil,
    telefono_fijo:
      payload.datosPersonales.telefonoFijo || undefined,
    email: payload.datosPersonales.email,
    email_alternativo:
      payload.datosPersonales.emailAlternativo || undefined,
    domicilio: payload.datosPersonales.domicilio,
    titulo_grado: payload.datosAcademicos.tituloGradoObtenido,
    titulo_posgrado:
      payload.datosAcademicos.tituloPosgrado || undefined,
    como_conocio: payload.datosAcademicos.canalDifusion,
    motivacion: payload.datosAcademicos.motivaciones,
    tipo_carreras: payload.datosAcademicos.tipoCarreras,
    carreras: [payload.datosAcademicos.carreraElegida],
    solicita_beca: payload.datosPersonales.solicitaBeca,
    tipo_beca: payload.datosPersonales.tipoBeca,
  };
}

async function subirDocumentoConTipo(
  legajoId: string,
  tipo: TipoDocumento,
  file: File,
  auth: boolean,
) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("tipo", tipo);

  return api.post(
    `/legajos/${legajoId}/documentos`,
    formData,
    { auth },
  );
}

async function subirDocumento(
  legajoId: string,
  docId: string,
  file: File,
  auth: boolean,
) {
  const tipo = DOCUMENTO_ID_A_TIPO[docId];

  if (!tipo) {
    throw new Error(`Tipo de documento desconocido: ${docId}`);
  }

  return subirDocumentoConTipo(legajoId, tipo, file, auth);
}

async function postInscripcion(
  payload: InscripcionPayload,
  auth: boolean,
): Promise<Legajo> {
  const legajo = await api.post<Legajo>(
    "/legajos",
    mapearACrearLegajoRequest(payload),
    { auth },
  );

  const subidas = Object.entries(payload.datosDocumentos)
    .filter(
      (entry): entry is [string, File] => entry[1] instanceof File,
    )
    .map(([docId, file]) =>
      subirDocumento(legajo.id, docId, file, auth),
    );

  if (
    payload.datosPersonales.solicitaBeca &&
    payload.datosPersonales.comprobanteBeca
  ) {
    subidas.push(
      subirDocumentoConTipo(
        legajo.id,
        "FORM_BECA",
        payload.datosPersonales.comprobanteBeca,
        auth,
      ),
    );
  }

  await Promise.all(subidas);

  return legajo;
}

export function useInscripcion(
  { auth = false }: { auth?: boolean } = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InscripcionPayload) =>
      postInscripcion(payload, auth),

    onSuccess: (legajo) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["legajos"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["documentos", legajo.id],
        }),
      ]),
  });
}