"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

const THEME_STORAGE_KEY = "aph-theme";

export type ThemeId =
  | "default"   // our normal dark
  | "light"
  | "ocean"
  | "purple"
  | "forest"
  | "sunset"
  | "halloween"
  | "christmas"
  | "easter";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(next: ThemeId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // "default" = use the base :root theme (no data-theme)
  if (next === "default") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", next);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("default");

  // On mount: read stored theme and apply
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(
      THEME_STORAGE_KEY
    ) as ThemeId | null;

    if (stored) {
      setThemeState(stored);
      applyTheme(stored);
    } else {
      // default theme
      applyTheme("default");
    }
  }, []);

  const setTheme = (next: ThemeId) => {
    setThemeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    }
    applyTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return ctx;
}
