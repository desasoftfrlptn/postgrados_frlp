import { useAuth } from "../../../manejo-sesion/useAuth";

export default function DashboardRolGeneralPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <section className="perfil-pagina">
      <header className="perfil-pagina-encabezado">
        <h1>Hola, {user.nombre}!</h1>
        <p>
          Iniciaste sesión como <strong>{user.rol}</strong>.
        </p>
      </header>

      <article className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          Panel en preparación
        </h2>
        <p className="mt-2 text-gray-600">
          El panel específico para el rol {user.rol} todavía está en desarrollo.
        </p>
      </article>
    </section>
  );
}