import type { WatchlistSummary } from "../types/scraps";

type Props = {
  summary: WatchlistSummary;
};

const summaryItems = [
  { key: "totalCount", label: "스크랩한 종목", unit: "개", toneClassName: "text-[color:var(--color-text-primary)]" },
  { key: "upCount", label: "오늘의 상승 종목", unit: "개", toneClassName: "text-[color:var(--color-text-danger)]" },
  { key: "buyCount", label: "매수 신호 포착", unit: "건", toneClassName: "text-[color:var(--color-text-danger)]" },
  { key: "sellCount", label: "매도 신호 포착", unit: "건", toneClassName: "text-[color:var(--color-text-info)]" },
] as const;

export default function WatchlistSummaryStats({ summary }: Props) {
  return (
    <section className="grid w-full grid-cols-2 gap-x-6 gap-y-0 px-2 py-2 md:px-4 lg:grid-cols-4 lg:gap-x-8 lg:px-0 lg:py-8">
      {summaryItems.map((item, index) => {
        const value = summary[item.key];
        const isMobileLeftColumn = index % 2 === 0;
        const hasDesktopRightBorder = index < summaryItems.length - 1;
        const hasMobileBottomBorder = index < 2;

        return (
          <div
            key={item.key}
            className={`flex flex-col gap-1 px-2 py-4 ${
              isMobileLeftColumn ? "border-r border-[color:var(--color-border-secondary)]" : ""
            } ${hasMobileBottomBorder ? "border-b border-[color:var(--color-border-secondary)]" : ""} ${
              hasDesktopRightBorder ? "lg:border-r" : ""
            } lg:border-b-0`}
          >
            <span className="typo-body-sm text-sm font-medium leading-5 text-[color:var(--color-text-secondary)] md:text-base md:leading-6">
              {item.label}
            </span>
            <div className="flex items-end gap-1">
              <span className={`text-2xl font-extrabold leading-8 md:text-3xl md:leading-10 lg:text-4xl lg:leading-10 ${item.toneClassName}`}>
                {value}
              </span>
              <span className="typo-body-sm pb-1 text-sm leading-5 text-[color:var(--color-text-tertiary)] md:text-base md:leading-6">
                {item.unit}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
