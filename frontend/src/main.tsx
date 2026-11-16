import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { shouldRetryQuery } from "./shared/api/client.ts";
import { setupApiAuth } from "./shared/auth/authSession.ts";
import { AuthProvider } from "./shared/auth/AuthProvider.tsx";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: shouldRetryQuery } },
});
setupApiAuth(queryClient);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider><App /></AuthProvider>
  </QueryClientProvider>,
);
