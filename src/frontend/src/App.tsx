// Componente principal que conecta la aplicación con las rutas definidas.

import { RouterProvider } from "react-router-dom";
import { router } from "./shared/router";

function App() {
  return <RouterProvider router={router} />;
}

export default App;