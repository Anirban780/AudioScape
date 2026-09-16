import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";

const ThemeProviderContext = createContext({
  theme: "system",
  themePreference: "system",
  resolvedTheme: "dark",
  currentLabel: "System",
  setTheme: () => null,
  cycleTheme: () => null,
});

/**
 * ============================================================================
 * THEME CONTEXT PROVIDER (ThemeProvider.jsx) - Workstream J1
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Manages theme selection across three states:
 * - 'system': Dynamically matches OS preference (prefers-color-scheme).
 * - 'dark': Forces dark mode.
 * - 'light': Forces light mode.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Explicit Distinction: Decouples `themePreference` (user's setting in localStorage)
 *    from `resolvedTheme` (actual CSS class applied to root document).
 * 2. Reactive OS Listener: Live updates when user changes OS dark/light setting
 *    without requiring page refresh.
 * 3. cycleTheme() Action: Cycles cleanly: System ──► Dark ──► Light ──► System.
 * 4. currentLabel: Returns informative labels: "System (Dark)", "System (Light)", "Light", "Dark".
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}) {
  const [themePreference, setThemePreference] = useState(() => {
    return localStorage.getItem(storageKey) || defaultTheme;
  });

  const getSystemTheme = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }, []);

  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  // Reactive OS prefers-color-scheme listener
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    // Modern addEventListener with backward compatibility check
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Compute resolved theme
  const resolvedTheme = useMemo(() => {
    if (themePreference === "system") {
      return systemTheme;
    }
    return themePreference;
  }, [themePreference, systemTheme]);

  // Synchronize root DOM class
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((newTheme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemePreference(newTheme);
  }, [storageKey]);

  // Clean cycle: system -> dark -> light -> system
  const cycleTheme = useCallback(() => {
    if (themePreference === "system") {
      setTheme("dark");
    } else if (themePreference === "dark") {
      setTheme("light");
    } else {
      setTheme("system");
    }
  }, [themePreference, setTheme]);

  // Descriptive label helper
  const currentLabel = useMemo(() => {
    if (themePreference === "system") {
      return `System (${systemTheme === "dark" ? "Dark" : "Light"})`;
    }
    return themePreference === "dark" ? "Dark" : "Light";
  }, [themePreference, systemTheme]);

  const value = useMemo(() => ({
    theme: themePreference,
    themePreference,
    resolvedTheme,
    currentLabel,
    setTheme,
    cycleTheme,
  }), [themePreference, resolvedTheme, currentLabel, setTheme, cycleTheme]);

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

