import { Outlet } from "react-router";
import { AuthProvider } from "../context/AuthContext";

export function Root() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
