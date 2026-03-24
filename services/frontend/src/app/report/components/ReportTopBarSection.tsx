"use client";

import Link from "next/link";

interface ReportTopBarSectionProps {
  stockId: string;
  companyName: string;
}

export default function ReportTopBarSection({ stockId, companyName }: ReportTopBarSectionProps) {
  return (
    <section className="flex w-full flex-col items-center border-b border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)]">
      <div className="flex w-full max-w-[1152px] items-center justify-between gap-6 px-4 py-4">
        <div className="flex items-center gap-6">
          <Link href={`/stocks/${stockId}`} className="flex h-10 w-10 items-center justify-center text-[color:var(--color-text-tertiary)]">
            <span className="text-2xl leading-none">←</span>
          </Link>
          <div className="flex items-center gap-2 text-base font-bold text-[color:var(--color-text-primary)]">
            <span>{companyName}</span>
            <span className="text-[color:var(--color-text-tertiary)]">|</span>
            <Link href={`/stocks/${stockId}`}>종목 상세 정보</Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg bg-[color:var(--color-bg-info-subtle)] px-4 py-2 text-sm font-bold text-[color:var(--color-text-info)]"
          >
            관심종목
          </button>
          <button
            type="button"
            className="rounded-lg bg-[color:var(--color-bg-tertiary)] px-4 py-2 text-sm font-bold text-[color:var(--color-text-secondary)]"
          >
            알림 설정
          </button>
        </div>
      </div>
    </section>
  );
}
