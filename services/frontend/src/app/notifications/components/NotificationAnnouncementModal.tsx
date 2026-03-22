"use client";

import { useEffect } from "react";
import { LuX } from "react-icons/lu";
import { createPortal } from "react-dom";
import type { NotificationItem } from "../types/notifications";

type Props = {
  item: NotificationItem | null;
  onClose: () => void;
};

export default function NotificationAnnouncementModal({ item, onClose }: Props) {
  useEffect(() => {
    if (!item) {
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
  }, [item, onClose]);

  if (!item || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[96] flex items-center justify-center px-4 py-6" onClick={onClose}>
      <div className="fixed inset-0 bg-[#00000066] backdrop-blur-[4px]" />
      <div
        className="relative z-[1] flex w-full max-w-lg flex-col gap-6 rounded-2xl bg-[color:var(--color-bg-primary)] p-6 shadow-[0px_16px_24px_-4px_rgba(0,0,0,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold leading-5 text-[color:var(--color-text-secondary)]">신규 공시</div>
            <h2 className="text-2xl font-extrabold leading-8 text-[color:var(--color-text-primary)]">{item.stockName}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="공시 알림 닫기"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--color-border-disabled)] transition-colors hover:bg-[color:var(--color-bg-interactive-secondary-hovered)] active:bg-[color:var(--color-bg-interactive-secondary-pressed)]"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-[color:var(--color-bg-secondary)] px-5 py-4 text-sm font-semibold leading-6 text-[color:var(--color-text-secondary)]">
          {item.message}
        </div>

        <div className="rounded-2xl border border-dashed border-[color:var(--color-border-secondary)] px-5 py-4 text-sm font-medium leading-6 text-[color:var(--color-text-secondary)]">
          공시 상세 모달은 아직 구현 전입니다. 백엔드 원문/상세 계약이 준비되면 이 자리에서 연결할 수 있습니다.
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-14 items-center justify-center rounded-xl bg-[color:var(--color-bg-inverse-bolder)] px-4 py-4 text-base font-semibold leading-6 text-[color:var(--color-text-base)] transition-opacity hover:opacity-90"
        >
          확인
        </button>
      </div>
    </div>,
    document.body,
  );
}
