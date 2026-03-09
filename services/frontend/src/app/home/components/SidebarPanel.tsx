import ValueChangeRateText from "@/shared/components/ValueChangeRateText";
import type { MarketIndexItem, MarketIndexPayload, PopularSearchItem } from "../types/main";
import { formatBaseTime, formatSignedRate, getRateTone } from "../utils/formatters";

function getRateClassName(value: number) {
  const tone = getRateTone(value);

  if (tone === "positive") {
    return "text-[color:var(--color-text-danger)]";
  }

  if (tone === "negative") {
    return "text-[color:var(--color-text-info)]";
  }

  return "text-[color:var(--color-text-tertiary)]";
}

function MiniTrendLine({ value }: { value: number }) {
  const tone = getRateTone(value);
  const stroke =
    tone === "positive"
      ? "var(--color-text-danger)"
      : tone === "negative"
        ? "var(--color-text-info)"
        : "var(--color-text-tertiary)";

  const points =
    tone === "positive"
      ? "2,18 10,14 18,15 26,10 34,11 42,7 54,5"
      : tone === "negative"
        ? "2,6 12,9 20,8 30,12 40,15 54,18"
        : "2,12 12,12 22,11 32,12 42,11 54,12";

  return (
    <svg viewBox="0 0 56 24" className="h-6 w-14" fill="none" aria-hidden>
      <polyline points={points} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MarketItem({ label, item }: { label: string; item: MarketIndexItem }) {
  return (
    <div className="border-b border-[color:var(--color-border-primary)] py-4 last:border-b-0 last:pb-0">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">{label}</div>
          <div className="mt-1 typo-heading-md text-[color:var(--color-text-primary)]">{item.value.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <ValueChangeRateText value={item.changeRate} className={`typo-body-sm font-semibold ${getRateClassName(item.changeRate)}`}>
            {formatSignedRate(item.changeRate)}
          </ValueChangeRateText>
          <MiniTrendLine value={item.changeRate} />
        </div>
      </div>
    </div>
  );
}

type Props = {
  marketIndex: MarketIndexPayload;
  marketLoading: boolean;
  searches: PopularSearchItem[];
  searchLoading: boolean;
};

export default function SidebarPanel({ marketIndex, marketLoading, searches, searchLoading }: Props) {
  return (
    <aside className="flex w-full flex-col gap-5">
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="typo-heading-sm text-[color:var(--color-text-primary)]">시장 현황</h2>
          <span className="typo-body-sm text-[color:var(--color-text-tertiary)]">{marketIndex.baseTime ? `${formatBaseTime(marketIndex.baseTime)} 기준` : "실시간"}</span>
        </div>

        {marketLoading ? <div className="h-56 rounded-2xl bg-[color:var(--color-bg-tertiary)]" /> : null}

        {!marketLoading ? (
          <div className="flex flex-col gap-0">
            <MarketItem label="코스피" item={marketIndex.kospi} />
            <MarketItem label="코스닥" item={marketIndex.kosdaq} />
            <MarketItem label="달러 환율" item={marketIndex.usdKrw} />
          </div>
        ) : null}
      </section>

      <section className="pt-7">
        <h3 className="typo-heading-sm text-[color:var(--color-text-primary)]">실시간 인기 검색</h3>
        <div className="mt-5 rounded-2xl pt-5">
          {searchLoading ? <div className="h-32 rounded-2xl bg-[color:var(--color-bg-tertiary)]" /> : null}
          {!searchLoading ? (
            <div className="flex flex-col gap-4">
              {searches.map((item) => (
                <div key={item.rank} className="flex items-center gap-3">
                  <span
                    className={`typo-body-sm w-3 text-center font-bold ${item.rank <= 3 ? "text-[color:var(--color-text-info)]" : "text-[color:var(--color-text-secondary)]"}`}
                  >
                    {item.rank}
                  </span>
                  <span className="typo-body-sm font-bold text-[color:var(--color-text-primary)]">{item.keyword}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="px-2 pt-3">
        <p className="typo-body-sm text-[color:var(--color-text-secondary)]">
          본 서비스는 투자 참고용이며,
          <br />
          최종 투자 결정과 책임은 본인에게 있습니다.
        </p>
      </section>
    </aside>
  );
}
