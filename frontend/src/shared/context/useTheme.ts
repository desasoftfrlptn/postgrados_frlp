import { useEffect, useState } from "react";

type Theme = "claro" | "oscuro";

const STORAGE_KEY = "fenix-theme";

function getInitialTheme(): Theme {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "claro" || stored === "oscuro") return stored;

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "oscuro" : "claro";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "oscuro");
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "oscuro" ? "claro" : "oscuro"));

  return { theme, toggleTheme };
}