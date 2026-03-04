"use client";

import { useTheme } from "@/shared/hooks/useTheme";
import Button from "@/shared/ui/Button";

export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="soft"
      className="h-8 px-2.5 text-xs"
      onClick={toggleTheme}
      aria-label="테마 전환"
      title="테마 전환"
    >
      {isDark ? "라이트 모드" : "다크 모드"}
    </Button>
  );
}
