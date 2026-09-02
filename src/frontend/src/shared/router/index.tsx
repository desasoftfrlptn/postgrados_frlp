import { createBrowserRouter } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "../auth/ProtectedRoute";
import HomePage from "../../home/pages/HomePage";
import LoginPage from "../auth/pages/LoginPage";
import DashboardPage from "../../dashboard/pages/DashboardPage";
import FormularioInscripcion from "../../inscripcion/pages/FormularioInscripcion";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: "dashboard", element: <DashboardPage /> },
          { path: "inscripcion", element: <FormularioInscripcion /> },
        ],
      },
    ],
  },
]);
