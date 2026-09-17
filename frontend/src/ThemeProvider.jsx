import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";

const ThemeProviderContext = createContext({
  theme: "dark",
  themePreference: "dark",
  resolvedTheme: "dark",
  currentLabel: "Dark",
  setTheme: () => null,
  toggleTheme: () => null,
  cycleTheme: () => null,
});

/**
 * ============================================================================
 * THEME CONTEXT PROVIDER (ThemeProvider.jsx) - Workstream J1
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Automatically identifies the OS system theme preference upon website launch,
 * while providing a clean binary toggle (Light <-> Dark) on the theme changer button.
 * 
 * DESIGN SPECIFICATIONS:
 * 1. Automatic System Theme Identification:
 *    - When the website is opened, detects the browser's OS theme setting
 *      via `window.matchMedia('(prefers-color-scheme: dark)')`.
 *    - If OS is light, the site initializes in Light mode with the button toggled to light.
 *    - If OS is dark, the site initializes in Dark mode with the button toggled to dark.
 * 2. Binary Light / Dark Toggle:
 *    - The theme changer button strictly toggles between 'light' and 'dark'.
 *    - No 'system' state, option, or laptop icon on the button.
 * 3. Reactive OS Listener:
 *    - Listens for live OS theme changes (`prefers-color-scheme`).
 *    - When the user changes their OS theme in system settings, the website
 *      and toggle button adapt in real time.
 * 4. Backward Compatibility:
 *    - Preserves `theme`, `resolvedTheme`, `themePreference`, `currentLabel`,
 *      `setTheme`, `toggleTheme`, and `cycleTheme` (alias to toggleTheme).
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}) {
  const getSystemTheme = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }, []);

  const [theme, setThemeState] = useState(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const manual = localStorage.getItem("audioscape_theme_manual");
      const saved = localStorage.getItem(storageKey);

      // Clean up legacy 'system' value if stored from previous implementation
      if (saved === "system") {
        localStorage.removeItem(storageKey);
        localStorage.removeItem("audioscape_theme_manual");
      } else if (manual === "true" && (saved === "light" || saved === "dark")) {
        // User explicitly clicked toggle button previously
        return saved;
      }
    } catch {
      // Ignore localStorage access errors (e.g. incognito restriction)
    }

    // Default to OS system theme on open
    return getSystemTheme();
  });

  // Reactive OS prefers-color-scheme listener
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e) => {
      const newSystemTheme = e.matches ? "dark" : "light";
      setThemeState(newSystemTheme);
      try {
        localStorage.setItem(storageKey, newSystemTheme);
        // Reset manual override so the site tracks the newly selected OS theme
        localStorage.removeItem("audioscape_theme_manual");
      } catch {}
    };

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
  }, [storageKey]);

  // Synchronize root DOM class ('light' or 'dark')
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  // Explicit setter
  const setTheme = useCallback((newTheme) => {
    const validTheme = newTheme === "light" ? "light" : "dark";
    try {
      localStorage.setItem(storageKey, validTheme);
      localStorage.setItem("audioscape_theme_manual", "true");
    } catch {}
    setThemeState(validTheme);
  }, [storageKey]);

  // Binary toggle: Light <-> Dark only
  const toggleTheme = useCallback(() => {
    setThemeState((prevTheme) => {
      const nextTheme = prevTheme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(storageKey, nextTheme);
        localStorage.setItem("audioscape_theme_manual", "true");
      } catch {}
      return nextTheme;
    });
  }, [storageKey]);

  const currentLabel = useMemo(() => {
    return theme === "dark" ? "Dark" : "Light";
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    themePreference: theme,
    resolvedTheme: theme,
    currentLabel,
    setTheme,
    toggleTheme,
    cycleTheme: toggleTheme,
  }), [theme, currentLabel, setTheme, toggleTheme]);

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


