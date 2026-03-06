"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppliedTheme, isThemeMode, THEME_STORAGE_KEY, ThemeMode } from "@/shared/lib/theme";

const THEME_CHANGE_EVENT = "sallaemallae:theme-change";

function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored && isThemeMode(stored) ? stored : "system";
}

function getSystemTheme(): AppliedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode, systemTheme: AppliedTheme): AppliedTheme {
  if (mode === "system") {
    return systemTheme;
  }

  return mode;
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;

  if (mode === "system") {
    root.removeAttribute("data-theme");
    localStorage.removeItem(THEME_STORAGE_KEY);
    return;
  }

  root.setAttribute("data-theme", mode);
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredThemeMode());
  const [systemTheme, setSystemTheme] = useState<AppliedTheme>(() => getSystemTheme());

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const syncSystemTheme = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    const syncThemeMode = (nextMode?: ThemeMode) => {
      setModeState(nextMode ?? getStoredThemeMode());
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        syncThemeMode();
      }
    };

    const onThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode?: ThemeMode }>;
      syncThemeMode(customEvent.detail?.mode);
    };

    mediaQuery.addEventListener("change", syncSystemTheme);
    window.addEventListener("storage", onStorage);
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange as EventListener);

    return () => {
      mediaQuery.removeEventListener("change", syncSystemTheme);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange as EventListener);
    };
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    applyTheme(nextMode);
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { mode: nextMode } }));
  }, []);

  const resolvedTheme = useMemo<AppliedTheme>(() => resolveTheme(mode, systemTheme), [mode, systemTheme]);

  const toggleTheme = useCallback(() => {
    const current = resolveTheme(mode, systemTheme);
    setMode(current === "dark" ? "light" : "dark");
  }, [mode, setMode, systemTheme]);

  return {
    mode,
    resolvedTheme,
    setMode,
    toggleTheme,
  };
}
