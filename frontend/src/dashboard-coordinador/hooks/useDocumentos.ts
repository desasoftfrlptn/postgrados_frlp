import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentosApi, type OpcionesCredenciales } from "@/shared/api/endpoints";
import { saveBlob } from "@/shared/api/files";

export function useDocumentos(id: string, opts: OpcionesCredenciales = { auth: true }) {
  return useQuery({
    queryKey: ["documentos", id, opts.auth ?? true],
    queryFn: () => documentosApi.listar(id, opts),
    enabled: Boolean(id),
  });
}

interface ObservarDocumentoPayload {
  legajoId: string;
  docId: string;
  accion: "APROBAR" | "OBSERVAR" | "MARCAR_FALTANTE";
  motivo?: string;
}

export function useObservarDocumento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ legajoId, docId, accion, motivo }: ObservarDocumentoPayload) =>
      documentosApi.revisar(legajoId, docId, { accion, motivo }),
    onSuccess: (_data, variables) => {
      // Refresca la lista de documentos de ESE legajo puntual.
      queryClient.invalidateQueries({ queryKey: ["documentos", variables.legajoId] });
      queryClient.invalidateQueries({ queryKey: ["consulta-estado"] });
    },
  });
}

type AbrirDocumentoPayload = { docId: string } & OpcionesCredenciales;

// Abrir la ventana ANTES de iniciar la mutation conserva el gesto del usuario.
export function useAbrirDocumento() {
  const mutation = useMutation({
    mutationFn: async ({ docId, auth = true, ventana }: AbrirDocumentoPayload & { ventana: Window | null }) => {
      if (!ventana) throw new Error("Habilita las ventanas emergentes para ver el PDF.");
      try {
        const { blob } = await documentosApi.descargar(docId, { auth });
        const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        if (ventana.closed) URL.revokeObjectURL(url);
        else {
          ventana.location.href = url;
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }
      } catch (error) {
        ventana.close();
        throw error;
      }
    },
  });
  const preparar = (datos: AbrirDocumentoPayload) => {
    const ventana = window.open("", "_blank");
    if (ventana) ventana.opener = null;
    return { ...datos, ventana };
  };
  return {
    ...mutation,
    mutate: (datos: AbrirDocumentoPayload) => mutation.mutate(preparar(datos)),
    mutateAsync: (datos: AbrirDocumentoPayload) => mutation.mutateAsync(preparar(datos)),
  };
}

// NUEVO: descarga el PDF (GET /documentos/:id/download). `nombre` es el nombre de respaldo.
export function useDescargarDocumento() {
  return useMutation({
    mutationFn: async ({ docId, nombre, auth = true }: { docId: string; nombre?: string } & OpcionesCredenciales) => {
      const { blob, filename } = await documentosApi.descargar(docId, { auth });
      saveBlob(blob, filename ?? nombre ?? "documento.pdf");
    },
  });
}
