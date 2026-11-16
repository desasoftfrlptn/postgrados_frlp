import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentosApi } from "@/shared/api/endpoints";
import { saveBlob } from "@/shared/api/files";

// PENDIENTE (backend): ningún endpoint de documentos tiene router todavía.
export function useDocumentos(id: string) {
  return useQuery({
    queryKey: ["documentos", id],
    queryFn: () => documentosApi.listar(id),
    enabled: Boolean(id),
  });
}

interface ObservarDocumentoPayload {
  legajoId: string;
  docId: string;
  accion: "OBSERVAR" | "MARCAR_FALTANTE";
  motivo: string;
}

export function useObservarDocumento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ legajoId, docId, accion, motivo }: ObservarDocumentoPayload) =>
      documentosApi.revisar(legajoId, docId, { accion, motivo }),
    onSuccess: (_data, variables) => {
      // Refresca la lista de documentos de ESE legajo puntual.
      queryClient.invalidateQueries({ queryKey: ["documentos", variables.legajoId] });
    },
  });
}

// NUEVO: vista previa del PDF en una pestaña nueva. El backend no entrega una URL pública del
// archivo: se baja con la sesión (Bearer) y se abre como blob. La pestaña se abre en el mismo gesto
// del clic, antes de esperar la respuesta, para que el navegador no la bloquee como pop-up.
export function useAbrirDocumento() {
  return useMutation({
    mutationFn: async ({ docId }: { docId: string }) => {
      const ventana = window.open("", "_blank");
      try {
        const { blob } = await documentosApi.descargar(docId);
        const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        if (ventana) ventana.location.href = url;
        else window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (error) {
        ventana?.close();
        throw error;
      }
    },
  });
}

// NUEVO: descarga el PDF (GET /documentos/:id/download). `nombre` es el nombre de respaldo.
export function useDescargarDocumento() {
  return useMutation({
    mutationFn: async ({ docId, nombre }: { docId: string; nombre?: string }) => {
      const { blob, filename } = await documentosApi.descargar(docId);
      saveBlob(blob, filename ?? nombre ?? "documento.pdf");
    },
  });
}
