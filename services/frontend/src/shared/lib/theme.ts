export const THEME_STORAGE_KEY = "sallaemallae-theme";

export type ThemeMode = "light" | "dark" | "system";
export type AppliedTheme = "light" | "dark";

export function isThemeMode(value: string): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

