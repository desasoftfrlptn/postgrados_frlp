import { useState } from "react";

export default function FormularioInscripcion() {
  const [datos, setDatos] = useState({
    dni: "",
    apellido: "",
    nombre: "",
    email: "",
    tipo_carrera: "Especializacion",
  });
  const [mensaje, setMensaje] = useState("");

  const enviarFormulario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const respuesta = await fetch("http://localhost:8000/api/v1/inscripcion/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });

      if (respuesta.ok) {
        setMensaje("¡Inscripción enviada con éxito! Revisa tu email.");
      } else {
        setMensaje("Error al enviar la inscripción. Verifica tus datos.");
      }
    } catch {
      setMensaje("Error de conexión con el servidor.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <section className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        
        <header>
          <h2 className="text-2xl font-bold text-center mb-6">Preinscripción a Posgrado</h2>
        </header>
        
        {mensaje && (
          <aside className="mb-4 p-3 bg-blue-100 text-blue-700 rounded text-center" role="alert">
            {mensaje}
          </aside>
        )}

        <form onSubmit={enviarFormulario} className="space-y-4">
          <fieldset className="border-none p-0 m-0 space-y-4">
            
            <p className="flex flex-col">
              <label htmlFor="dni" className="text-sm font-medium text-gray-700">DNI</label>
              <input id="dni" required type="text" className="mt-1 border rounded-md p-2"
                onChange={(e) => setDatos({ ...datos, dni: e.target.value })} />
            </p>

            <p className="flex flex-col">
              <label htmlFor="nombre" className="text-sm font-medium text-gray-700">Nombre</label>
              <input id="nombre" required type="text" className="mt-1 border rounded-md p-2"
                onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
            </p>

            <p className="flex flex-col">
              <label htmlFor="apellido" className="text-sm font-medium text-gray-700">Apellido</label>
              <input id="apellido" required type="text" className="mt-1 border rounded-md p-2"
                onChange={(e) => setDatos({ ...datos, apellido: e.target.value })} />
            </p>

            <p className="flex flex-col">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
              <input id="email" required type="email" className="mt-1 border rounded-md p-2"
                onChange={(e) => setDatos({ ...datos, email: e.target.value })} />
            </p>

            <p className="flex flex-col">
              <label htmlFor="carrera" className="text-sm font-medium text-gray-700">Carrera</label>
              <select id="carrera" className="mt-1 border rounded-md p-2"
                onChange={(e) => setDatos({ ...datos, tipo_carrera: e.target.value })}>
                <option value="Especializacion">Especialización</option>
                <option value="Maestria">Maestría</option>
                <option value="Doctorado">Doctorado</option>
              </select>
            </p>

          </fieldset>

          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors">
            Enviar Inscripción
          </button>
        </form>

      </section>
    </main>
  );
}