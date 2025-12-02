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
  | "dark"
  | "light"
  | "ocean"
  | "purple"
  | "forest"
  | "sunset"
  | "halloween"
  | "christmas"
  | "easter";

type ThemeOption = {
  id: ThemeId;
  label: string;
  description?: string;
  seasonal?: boolean;
};

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "dark",
    label: "Default dark",
    description: "Current look – calm, minimal dark mode.",
  },
  {
    id: "light",
    label: "Light mode",
    description: "Bright, paper-like background that's easy on the eyes.",
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Deep blues, calm and focused.",
  },
  {
    id: "purple",
    label: "Purple neon",
    description: "Futuristic, high-contrast purple glow.",
  },
  {
    id: "forest",
    label: "Forest",
    description: "Greenish tones with cozy contrast.",
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm pink/orange vibe for evening sessions.",
  },
  {
    id: "halloween",
    label: "Halloween",
    description: "Spooky orange glow around October.",
    seasonal: true,
  },
  {
    id: "christmas",
    label: "Christmas",
    description: "Green & red festive theme for December.",
    seasonal: true,
  },
  {
    id: "easter",
    label: "Easter",
    description: "Soft pastel colors for spring.",
    seasonal: true,
  },
];

const STORAGE_KEY = "ui_theme";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isThemeId(val: string): val is ThemeId {
  return THEME_OPTIONS.some((opt) => opt.id === val);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("dark");

  // Load initial theme from localStorage or prefers-color-scheme
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isThemeId(stored)) {
      applyTheme(stored);
      return;
    }

    // Fallback: respect system preference just for light/dark
    const prefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches;
    const initial: ThemeId = prefersDark ? "dark" : "light";
    applyTheme(initial);
  }, []);

  function applyTheme(next: ThemeId) {
    setThemeState(next);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", next);
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }

  const value: ThemeContextValue = {
    theme,
    setTheme: applyTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
