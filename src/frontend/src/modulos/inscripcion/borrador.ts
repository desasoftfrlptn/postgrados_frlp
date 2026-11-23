// Guarda el borrador completo de la inscripción en el navegador.

const NOMBRE_BASE_DATOS = "PostgradosFRLP";
const VERSION_BASE_DATOS = 1;
const NOMBRE_ALMACEN = "borradores";

export const VIGENCIA_BORRADOR_MS = 24 * 60 * 60 * 1000;

// Comprueba si el borrador sigue dentro de su periodo de vigencia.
export function borradorVencido(
  actualizadoEn: number,
  ahora = Date.now()
): boolean {
  return (
    !Number.isFinite(actualizadoEn) ||
    actualizadoEn <= 0 ||
    actualizadoEn > ahora ||
    ahora - actualizadoEn >= VIGENCIA_BORRADOR_MS
  );
}


export interface BorradorInscripcion {
  id: string;
  datos: Record<string, string>;
  documentos: Record<string, File | null>;
  otroPais: string;
  cohorteSeleccionada?: string;
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

// Recupera el borrador y elimina los datos vencidos.
export const recuperarBorrador = async (): Promise<
  BorradorInscripcion | undefined
> => {
  const baseDatos = await abrirBaseDatos();

  return new Promise((resolve, reject) => {
    const transaccion = baseDatos.transaction(
      NOMBRE_ALMACEN,
      "readwrite"
    );

    const almacen = transaccion.objectStore(NOMBRE_ALMACEN);
    const solicitud = almacen.get("inscripcion");

    let borrador: BorradorInscripcion | undefined;

    solicitud.onsuccess = () => {
      const resultado = solicitud.result as
        BorradorInscripcion | undefined;

      if (resultado && borradorVencido(resultado.actualizadoEn)) {
        almacen.delete("inscripcion");
        return;
      }

      borrador = resultado;
    };

    transaccion.oncomplete = () => {
      baseDatos.close();
      resolve(borrador);
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