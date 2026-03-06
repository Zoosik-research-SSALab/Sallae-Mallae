"use client";

import { useEffect, useRef, useState } from "react";
import { FiMonitor, FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "@/shared/hooks/useTheme";
import { ThemeMode } from "@/shared/lib/theme";

type ThemeOption = {
  label: string;
  mode: ThemeMode;
  Icon: typeof FiSun;
};

const themeOptions: ThemeOption[] = [
  { label: "라이트", mode: "light", Icon: FiSun },
  { label: "다크", mode: "dark", Icon: FiMoon },
  { label: "시스템", mode: "system", Icon: FiMonitor },
];

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      <div ref={containerRef} className="pointer-events-auto absolute bottom-6 right-6 flex flex-col items-end gap-3">
        {isOpen ? (
          <div className="flex min-w-[132px] flex-col rounded-2xl border border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)] p-2 shadow-[0px_16px_40px_rgba(0,0,0,0.14)] backdrop-blur-[10px]">
            {themeOptions.map(({ label, mode: optionMode, Icon }) => {
              const isActive = mode === optionMode;

              return (
                <button
                  key={optionMode}
                  type="button"
                  onClick={() => {
                    setMode(optionMode);
                    setIsOpen(false);
                  }}
                  className={`typo-body-md inline-flex items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold transition-colors ${
                    isActive
                      ? "bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-primary)]"
                      : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-bg-tertiary)] hover:text-[color:var(--color-text-primary)]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="typo-body-md inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)] px-4 py-2 font-semibold text-[color:var(--color-text-primary)] shadow-[0px_12px_30px_rgba(0,0,0,0.12)] transition-colors hover:bg-[color:var(--color-bg-tertiary)]"
          aria-label="테마 모드 선택"
        >
          <FiMonitor className="h-4 w-4" />
          <span>테마</span>
        </button>
      </div>
    </div>
  );
}
