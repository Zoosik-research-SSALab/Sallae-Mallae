"use client";

import { useEffect, useMemo, useState } from "react";
import { AppliedTheme, isThemeMode, THEME_STORAGE_KEY, ThemeMode } from "@/shared/lib/theme";

function resolveTheme(mode: ThemeMode): AppliedTheme {
  if (mode === "light" || mode === "dark") {
    return mode;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "system";
    }
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored && isThemeMode(stored) ? stored : "system";
  });

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  const resolvedTheme = useMemo<AppliedTheme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    return resolveTheme(mode);
  }, [mode]);

  const toggleTheme = () => {
    const current = resolveTheme(mode);
    setMode(current === "dark" ? "light" : "dark");
  };

  return {
    mode,
    resolvedTheme,
    setMode,
    toggleTheme,
  };
}
