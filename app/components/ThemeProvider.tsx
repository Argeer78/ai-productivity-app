// app/components/ThemeProvider.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type ThemeId =
  | "default"   // your base dark theme (:root)
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
  setTheme: (t: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "aph_theme";

function applyTheme(theme: ThemeId) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  if (theme === "default") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("default");

   // Load initial theme from localStorage or system preference
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (saved) {
      setThemeState(saved);
      applyTheme(saved);
      return;
    }

    // 🎃🎄🐣 Seasonal default (if user has NOT chosen anything yet)
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();

    let seasonal: ThemeId | null = null;

    // Halloween: Oct 25–31
    if (month === 10 && day >= 25 && day <= 31) {
      seasonal = "halloween";
    }
    // Christmas: Dec 20–31
    else if (month === 12 && day >= 20 && day <= 31) {
      seasonal = "christmas";
    }
    // Easter-ish: March–April (simple heuristic)
    else if (month === 3 || month === 4) {
      seasonal = "easter";
    }

    if (seasonal) {
      setThemeState(seasonal);
      applyTheme(seasonal);
      return;
    }

    // Fallback: system preference for default vs light
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const initial: ThemeId = prefersDark ? "default" : "light";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

   function setTheme(next: ThemeId) {
    setThemeState(next);
    if (typeof window !== "undefined") {
      if (next === "default") {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    }
    applyTheme(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
}