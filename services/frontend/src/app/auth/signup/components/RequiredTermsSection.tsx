"use client";

import type { TermsAgreementItem } from "@/shared/types/auth";

type AgreementState = Record<number, boolean>;

type Props = {
  items: TermsAgreementItem[];
  agreements: AgreementState;
  onOpenTerm: (term: TermsAgreementItem) => void;
};

export default function RequiredTermsSection({ items, agreements, onOpenTerm }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">필수 약관</span>
        <span className="typo-body-xs text-[color:var(--color-text-tertiary)]">모두 동의해야 가입이 완료됩니다.</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <button
            key={item.termsId}
            type="button"
            onClick={() => onOpenTerm(item)}
            className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--color-border-primary)] px-4 py-3 text-left transition-colors hover:bg-[color:var(--color-bg-secondary)]"
          >
            <div className="flex flex-col gap-1">
              <span className="typo-body-md font-semibold text-[color:var(--color-text-primary)]">{item.title}</span>
              <span className="typo-body-xs text-[color:var(--color-text-tertiary)]">필수</span>
            </div>
            <span
              aria-hidden
              className={`inline-flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                agreements[item.termsId]
                  ? "border-[color:var(--color-border-interactive-primary)] bg-[color:var(--color-bg-interactive-primary)] text-[color:var(--color-text-interactive-inverse)]"
                  : "border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)] text-transparent"
              }`}
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
                <path d="M3.5 8 6.5 11 12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
