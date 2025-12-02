"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type ThemeId =
  | "dark"
  | "light"
  | "ocean"
  | "purple"
  | "forest"
  | "sunset"
  | "halloween"
  | "christmas"
  | "easter";

export type ThemeInfo = {
  id: ThemeId;
  label: string;
  description?: string;
  seasonal?: boolean;
};

export const THEME_OPTIONS: ThemeInfo[] = [
  {
    id: "dark",
    label: "Dark (default)",
    description: "High-contrast, midnight workspace.",
  },
  {
    id: "light",
    label: "Light",
    description: "Clean, bright, paper-like appearance.",
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Deep blues with calm cyan accents.",
  },
  {
    id: "purple",
    label: "Purple Neon",
    description: "Vibrant purple with neon accents.",
  },
  {
    id: "forest",
    label: "Forest",
    description: "Muted greens, grounded and calm.",
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm oranges and pink highlights.",
  },
  {
    id: "halloween",
    label: "Halloween",
    description: "Dark theme with orange highlights.",
    seasonal: true,
  },
  {
    id: "christmas",
    label: "Christmas",
    description: "Cozy greens and reds.",
    seasonal: true,
  },
  {
    id: "easter",
    label: "Easter",
    description: "Soft pastel palette.",
    seasonal: true,
  },
];

const STORAGE_KEY = "aph_ui_theme";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(id: ThemeId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", id);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("dark");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;

    if (stored && THEME_OPTIONS.some((t) => t.id === stored)) {
      setThemeState(stored);
      applyTheme(stored);
      return;
    }

    // Fallback: system preference
    const prefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches;
    const initial: ThemeId = prefersDark ? "dark" : "light";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  function setTheme(next: ThemeId) {
    setThemeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    applyTheme(next);
  }

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
