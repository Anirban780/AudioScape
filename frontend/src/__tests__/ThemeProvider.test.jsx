import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../ThemeProvider";

// Test component to read and toggle theme context
function ThemeConsumer() {
  const { theme, resolvedTheme, themePreference, currentLabel, toggleTheme, cycleTheme } = useTheme();
  return (
    <div>
      <div data-testid="theme-val">{theme}</div>
      <div data-testid="resolved-theme-val">{resolvedTheme}</div>
      <div data-testid="theme-pref-val">{themePreference}</div>
      <div data-testid="label-val">{currentLabel}</div>
      <button data-testid="toggle-btn" onClick={toggleTheme}>
        Toggle
      </button>
      <button data-testid="cycle-btn" onClick={cycleTheme}>
        Cycle
      </button>
    </div>
  );
}

describe("ThemeProvider - System Detection & Binary Light/Dark Toggle", () => {
  let listeners = [];
  let matchesDark = true;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    listeners = [];
    matchesDark = true;

    // Mock window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: matchesDark,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event, cb) => {
        listeners.push(cb);
      }),
      removeEventListener: vi.fn((event, cb) => {
        listeners = listeners.filter((l) => l !== cb);
      }),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("identifies OS system dark theme on initial launch when no manual preference is saved", () => {
    matchesDark = true;

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-val").textContent).toBe("dark");
    expect(screen.getByTestId("resolved-theme-val").textContent).toBe("dark");
    expect(screen.getByTestId("label-val").textContent).toBe("Dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("identifies OS system light theme on initial launch and initializes site in light mode", () => {
    matchesDark = false;

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-val").textContent).toBe("light");
    expect(screen.getByTestId("resolved-theme-val").textContent).toBe("light");
    expect(screen.getByTestId("label-val").textContent).toBe("Light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("cleans up legacy 'system' value from localStorage and respects current system theme", () => {
    matchesDark = false; // OS is Light
    localStorage.setItem("vite-ui-theme", "system");

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Legacy 'system' should be cleared from localStorage
    expect(localStorage.getItem("vite-ui-theme")).toBeNull();
    // Resolves to current OS theme: light
    expect(screen.getByTestId("theme-val").textContent).toBe("light");
    expect(screen.getByTestId("label-val").textContent).toBe("Light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("toggles strictly between light and dark (binary toggle, no 'system' state)", () => {
    matchesDark = false; // Initial: Light

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-val").textContent).toBe("light");

    // 1st click: Light -> Dark
    fireEvent.click(screen.getByTestId("toggle-btn"));
    expect(screen.getByTestId("theme-val").textContent).toBe("dark");
    expect(screen.getByTestId("label-val").textContent).toBe("Dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("vite-ui-theme")).toBe("dark");
    expect(localStorage.getItem("audioscape_theme_manual")).toBe("true");

    // 2nd click: Dark -> Light
    fireEvent.click(screen.getByTestId("toggle-btn"));
    expect(screen.getByTestId("theme-val").textContent).toBe("light");
    expect(screen.getByTestId("label-val").textContent).toBe("Light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(localStorage.getItem("vite-ui-theme")).toBe("light");

    // 3rd click with cycleBtn (alias for backward compatibility): Light -> Dark
    fireEvent.click(screen.getByTestId("cycle-btn"));
    expect(screen.getByTestId("theme-val").textContent).toBe("dark");
    expect(screen.getByTestId("label-val").textContent).toBe("Dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("reactively updates theme when user changes OS theme setting", () => {
    matchesDark = true;

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme-val").textContent).toBe("dark");

    // Simulate OS switching to Light theme
    act(() => {
      listeners.forEach((listener) => listener({ matches: false }));
    });

    expect(screen.getByTestId("theme-val").textContent).toBe("light");
    expect(screen.getByTestId("label-val").textContent).toBe("Light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    // Simulate OS switching back to Dark theme
    act(() => {
      listeners.forEach((listener) => listener({ matches: true }));
    });

    expect(screen.getByTestId("theme-val").textContent).toBe("dark");
    expect(screen.getByTestId("label-val").textContent).toBe("Dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
