"use client";

import { useEffect } from "react";
import { LuSettings2, LuX } from "react-icons/lu";
import { createPortal } from "react-dom";
import ToggleSwitch from "@/shared/ui/ToggleSwitch";
import type { NotificationSettings } from "../types/notifications";

type Props = {
  open: boolean;
  settings: NotificationSettings | null;
  isLoading: boolean;
  isUpdating: boolean;
  onClose: () => void;
  onToggleRealtime: () => void;
  onToggleEmail: () => void;
};

export default function NotificationSettingsModal({
  open,
  settings,
  isLoading,
  isUpdating,
  onClose,
  onToggleRealtime,
  onToggleEmail,
}: Props) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-4 py-6" onClick={onClose}>
      <div className="fixed inset-0 bg-[#00000066] backdrop-blur-[4px]" />
      <div
        className="relative z-[1] inline-flex w-full max-w-96 flex-col rounded-2xl bg-[color:var(--color-bg-primary)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[color:var(--color-border-primary)] px-6 pt-4 pb-3">
          <h2 className="text-xl font-extrabold leading-6 text-[color:var(--color-text-primary)]">알림 설정</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="알림 설정 닫기"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--color-border-disabled)] transition-colors hover:bg-[color:var(--color-bg-interactive-secondary-hovered)] active:bg-[color:var(--color-bg-interactive-secondary-pressed)]"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-8">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                  <div className="h-4 w-full animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                </div>
                <div className="h-7 w-12 animate-pulse rounded-full bg-[color:var(--color-bg-secondary)]" />
              </div>
            ))
          ) : settings ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-base font-semibold leading-6 text-[color:var(--color-text-primary)]">앱 내 실시간 알림</div>
                  <div className="text-sm font-medium leading-5 text-[color:var(--color-text-secondary)]">
                    급등락 및 매매신호를 즉시 알려드려요.
                  </div>
                </div>
                <ToggleSwitch enabled={settings.isNotiEnabled} onToggle={onToggleRealtime} disabled={isUpdating} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-base font-semibold leading-6 text-[color:var(--color-text-primary)]">이메일 데일리 브리핑</div>
                  <div className="text-sm font-medium leading-5 text-[color:var(--color-text-secondary)]">
                    매일 장 마감 후 요약본을 보내드려요.
                  </div>
                </div>
                <ToggleSwitch enabled={settings.isEmailNotiEnabled} onToggle={onToggleEmail} disabled={isUpdating} />
              </div>
            </>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--color-bg-secondary)] px-4 py-3 text-sm font-medium text-[color:var(--color-text-secondary)]">
              <LuSettings2 className="h-4 w-4" />
              알림 설정을 불러오지 못했습니다.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
