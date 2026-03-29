"use client";

import Link from "next/link";
import StockActionButtons from "@/app/stocks/[ticker]/components/StockActionButtons";

interface ReportTopBarSectionProps {
  stockId: string;
  companyName: string;
}

export default function ReportTopBarSection({ stockId, companyName }: ReportTopBarSectionProps) {
  const numericStockId = Number(stockId);
  const resolvedStockId = Number.isFinite(numericStockId) ? numericStockId : undefined;

  return (
    <section className="flex w-full flex-col items-center border-b border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)]">
      <div className="flex w-full max-w-[1152px] items-center justify-between gap-6 px-4 py-4">
        <div className="flex items-center gap-6">
          <Link href={`/stocks/${stockId}`} className="flex h-10 w-10 items-center justify-center text-[color:var(--color-text-tertiary)]">
            <span className="text-2xl leading-none">←</span>
          </Link>
          <div className="hidden items-center gap-2 text-base font-bold text-[color:var(--color-text-primary)] md:flex">
            <span>{companyName}</span>
            <span className="text-[color:var(--color-text-tertiary)]">|</span>
            <Link href={`/stocks/${stockId}`}>종목 상세 리포트</Link>
          </div>
        </div>

        <StockActionButtons stockId={resolvedStockId} stockName={companyName} />
      </div>
    </section>
  );
}
