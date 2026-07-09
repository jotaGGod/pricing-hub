import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getPreferences, updateTheme as saveTheme } from "../../services/preferences";
import type { Theme } from "../../types";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function initialTheme(): Theme {
  const stored = localStorage.getItem("pricing-hub-theme");
  return stored === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("pricing-hub-theme", theme);
  }, [theme]);

  useEffect(() => {
    getPreferences()
      .then((preference) => setThemeState(preference.theme))
      .catch(() => undefined);
  }, []);

  const setTheme = useCallback(async (nextTheme: Theme) => {
    setThemeState(nextTheme);
    await saveTheme(nextTheme).catch(() => undefined);
  }, []);

  const toggleTheme = useCallback(async () => {
    await setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}
