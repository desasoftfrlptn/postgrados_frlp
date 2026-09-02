export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-3xl font-bold text-gray-800">Bienvenido al sistema</h1>
      <a href="/login" className="text-blue-600 hover:underline text-sm">Iniciar sesion</a>
    </div>
  );
}
