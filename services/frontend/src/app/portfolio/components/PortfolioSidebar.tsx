import Link from "next/link";
import { BiShow } from "react-icons/bi";
import { PiChartLineDown, PiChartLineUp } from "react-icons/pi";
import { RiTimerLine } from "react-icons/ri";
import type { IconType } from "react-icons";
import type { PortfolioPopularSignal, PortfolioSignalSummary } from "../types/portfolio";
import { formatCurrency, formatInteger, getSignalActionClassName, getSignalActionLabel } from "../utils/portfolioFormatters";

type Props = {
  signalSummary: PortfolioSignalSummary;
  popularSignals: PortfolioPopularSignal[];
  className?: string;
};

const signalSummaryItems: Array<{
  id: "buy" | "sell" | "hold" | "watch";
  label: string;
  key: keyof Pick<PortfolioSignalSummary, "buyCount" | "sellCount" | "holdCount" | "watchCount">;
  Icon: IconType;
  iconClassName: string;
  valueClassName: string;
}> = [
  {
    id: "buy",
    label: "매수 포착",
    key: "buyCount",
    Icon: PiChartLineUp,
    iconClassName: "text-[color:var(--color-text-danger-bold)]",
    valueClassName: "text-[color:var(--color-text-danger-bold)]",
  },
  {
    id: "sell",
    label: "매도 청산",
    key: "sellCount",
    Icon: PiChartLineDown,
    iconClassName: "text-[color:var(--color-text-info)]",
    valueClassName: "text-[color:var(--color-text-info)]",
  },
  {
    id: "hold",
    label: "보유 유지",
    key: "holdCount",
    Icon: RiTimerLine,
    iconClassName: "text-[color:var(--color-text-success)]",
    valueClassName: "text-[color:var(--color-text-success)]",
  },
  {
    id: "watch",
    label: "관망/보류",
    key: "watchCount",
    Icon: BiShow,
    iconClassName: "text-[color:var(--color-text-warning)]",
    valueClassName: "text-[color:var(--color-text-secondary)]",
  },
];

export default function PortfolioSidebar({ signalSummary, popularSignals, className }: Props) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-6">
        <section className="rounded-3xl bg-[color:var(--color-bg-secondary)] p-6 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)] md:p-8">
          <div className="flex items-start justify-between gap-4 border-b border-[color:var(--color-border-primary)] pb-4">
            <div className="flex flex-col gap-1">
              <h2 className="typo-heading-sm text-[color:var(--color-text-primary)]">오늘의 시그널 요약</h2>
              <p className="typo-body-xs text-[color:var(--color-text-secondary)]">{signalSummary.baseUniverseLabel}</p>
            </div>
            <span className="inline-flex rounded-md bg-[color:var(--color-bg-info-subtle)] px-2 py-1 text-xs font-semibold text-[color:var(--color-text-info)]">
              Today
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {signalSummaryItems.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl bg-[color:var(--color-bg-primary)] p-4 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]"
              >
                <div className="mb-2.5 flex items-center">
                  <item.Icon className={`mr-1 h-[18px] w-[18px] shrink-0 ${item.iconClassName}`} />
                  <p className="typo-body-xs font-semibold text-[color:var(--color-text-secondary)]">{item.label}</p>
                </div>
                <div className="flex items-end gap-1">
                  <span className={`text-[24px] leading-6 font-extrabold ${item.valueClassName}`}>
                    {formatInteger(signalSummary[item.key])}
                  </span>
                  <span className="typo-body-sm font-semibold text-[color:var(--color-text-tertiary)]">종목</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-[color:var(--color-bg-primary)] p-6 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)] md:p-8">
          <div className="flex items-center justify-between gap-4 border-b border-[color:var(--color-border-primary)] pb-4">
            <h2 className="typo-heading-sm text-[color:var(--color-text-primary)]">인기 종목 AI 신호</h2>
            <Link href="/signals" className="typo-body-sm font-medium text-[color:var(--color-text-tertiary)]">
              더보기
            </Link>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            {popularSignals.map((item) => (
              <Link
                key={`${item.ticker}-${item.rank}`}
                href={`/report/${item.stockId}`}
                className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-[color:var(--color-bg-secondary)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-4 text-center text-sm font-semibold text-[color:var(--color-text-info)]">{item.rank}</span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-extrabold leading-6 text-[color:var(--color-text-primary)]">{item.name}</p>
                    <p className="typo-body-sm text-[color:var(--color-text-tertiary)]">{formatCurrency(item.price)}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-md px-3 py-1 text-xs font-semibold ${getSignalActionClassName(item.action)}`}>
                  {getSignalActionLabel(item.action)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
