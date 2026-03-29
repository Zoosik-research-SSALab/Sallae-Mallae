"use client";

import { useEffect, useRef } from "react";
import { usePolicyDetailQuery } from "@/shared/hooks/usePolicyDetailQuery";
import type { PolicyKind } from "@/shared/types/policy";
import Button from "@/shared/ui/Button";
import CloseIcon from "@/shared/ui/CloseIcon";

type Props = {
  policyKind: PolicyKind | null;
  open: boolean;
  onClose: () => void;
  onAgree: () => void;
};

function formatEnforcedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function PolicyDetailModal({ policyKind, open, onClose, onAgree }: Props) {
  const { data, isLoading, isError, error, refetch } = usePolicyDetailQuery(policyKind, open);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!open || !policyKind) {
    return null;
  }

  const content = isLoading ? (
    <div className="flex flex-col gap-3">
      <div className="h-6 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
      <div className="h-6 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
      <div className="h-32 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
    </div>
  ) : isError ? (
    <div className="flex flex-col gap-4 rounded-2xl bg-[color:var(--color-bg-secondary)] p-4">
      <p className="typo-body-sm text-[color:var(--color-text-secondary)]">
        {error instanceof Error ? error.message : "약관 정보를 불러오지 못했습니다."}
      </p>
      <Button type="button" variant="soft" className="self-start rounded-xl" onClick={() => void refetch()}>
        다시 시도
      </Button>
    </div>
  ) : data ? (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl leading-7 font-extrabold text-[color:var(--color-text-primary)]">{data.title}</h2>
        <div className="typo-body-xs text-[color:var(--color-text-tertiary)]">
          시행일 {formatEnforcedAt(data.enforcedAt)} / 버전 {data.version}
        </div>
      </div>
      <div className="min-h-0 max-h-[50vh] overflow-y-auto rounded-2xl bg-[color:var(--color-bg-secondary)] px-4 py-4">
        <p className="whitespace-pre-wrap text-sm leading-6 font-medium text-[color:var(--color-text-secondary)]">{data.content}</p>
      </div>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
      <button type="button" aria-label="약관 상세 모달 닫기" onClick={onClose} className="fixed inset-0 bg-black/56 backdrop-blur-[2px]" />
      <div className="relative z-[1] flex w-full max-w-[34rem] flex-col rounded-[28px] bg-[color:var(--color-bg-primary)] px-6 py-7 shadow-[0px_18px_40px_rgba(0,0,0,0.12)] sm:px-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--color-text-tertiary)] transition-colors hover:bg-[color:var(--color-bg-tertiary)] hover:text-[color:var(--color-text-primary)]"
          aria-label="닫기"
        >
          <CloseIcon />
        </button>

        {content}

        <div className="mt-6 flex gap-3">
          <Button type="button" variant="soft" className="min-h-12 flex-1 rounded-2xl" onClick={onClose}>
            닫기
          </Button>
          <Button
            type="button"
            variant="primary"
            className="min-h-12 flex-1 rounded-2xl border-transparent bg-[color:var(--color-bg-interactive-primary)] text-[color:var(--color-text-interactive-inverse)]"
            onClick={onAgree}
            disabled={isLoading || isError}
          >
            동의합니다
          </Button>
        </div>
      </div>
    </div>
  );
}
