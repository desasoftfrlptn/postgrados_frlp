// Guarda el borrador completo de la inscripción en el navegador.

const NOMBRE_BASE_DATOS = "PostgradosFRLP";
const VERSION_BASE_DATOS = 1;
const NOMBRE_ALMACEN = "borradores";

export interface BorradorInscripcion {
  id: string;
  datos: Record<string, string>;
  documentos: Record<string, File | null>;
  otroPais: string;
  etapa: number;
  actualizadoEn: number;
}

// Abre la base de datos y crea el almacén si todavía no existe.
const abrirBaseDatos = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(
      NOMBRE_BASE_DATOS,
      VERSION_BASE_DATOS
    );

    solicitud.onupgradeneeded = () => {
      const baseDatos = solicitud.result;

      if (!baseDatos.objectStoreNames.contains(NOMBRE_ALMACEN)) {
        baseDatos.createObjectStore(NOMBRE_ALMACEN, {
          keyPath: "id",
        });
      }
    };

    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
};

// Guarda o actualiza el borrador.
export const guardarBorrador = async (
  borrador: BorradorInscripcion
): Promise<void> => {
  const baseDatos = await abrirBaseDatos();

  return new Promise((resolve, reject) => {
    const transaccion = baseDatos.transaction(
      NOMBRE_ALMACEN,
      "readwrite"
    );

    transaccion.objectStore(NOMBRE_ALMACEN).put(borrador);

    transaccion.oncomplete = () => {
      baseDatos.close();
      resolve();
    };

    transaccion.onerror = () => {
      baseDatos.close();
      reject(transaccion.error);
    };

    transaccion.onabort = () => {
      baseDatos.close();
      reject(transaccion.error);
    };
  });
};

// Recupera el borrador guardado.
export const recuperarBorrador = async (): Promise<
  BorradorInscripcion | undefined
> => {
  const baseDatos = await abrirBaseDatos();

  return new Promise((resolve, reject) => {
    const transaccion = baseDatos.transaction(
      NOMBRE_ALMACEN,
      "readonly"
    );

    const solicitud = transaccion
      .objectStore(NOMBRE_ALMACEN)
      .get("inscripcion");

    solicitud.onsuccess = () => {
      baseDatos.close();
      resolve(solicitud.result);
    };

    solicitud.onerror = () => {
      baseDatos.close();
      reject(solicitud.error);
    };
  });
};

// Elimina el borrador guardado.
export const eliminarBorrador = async (): Promise<void> => {
  const baseDatos = await abrirBaseDatos();

  return new Promise((resolve, reject) => {
    const transaccion = baseDatos.transaction(
      NOMBRE_ALMACEN,
      "readwrite"
    );

    transaccion.objectStore(NOMBRE_ALMACEN).delete("inscripcion");

    transaccion.oncomplete = () => {
      baseDatos.close();
      resolve();
    };

    transaccion.onerror = () => {
      baseDatos.close();
      reject(transaccion.error);
    };

    transaccion.onabort = () => {
      baseDatos.close();
      reject(transaccion.error);
    };
  });
};