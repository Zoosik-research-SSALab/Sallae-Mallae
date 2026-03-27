import type {
  BacktestBestTrade,
  BacktestStats,
} from "../types/portfolioStockDetail";

type Props = {
  bestTrade: BacktestBestTrade;
  stats: BacktestStats;
  stockName: string;
};

export default function BacktestResults({
  bestTrade,
  stats,
  stockName,
}: Props) {
  return (
    <div className="flex flex-col gap-8">
      {/* Section header */}
      <div className="flex flex-col gap-1">
        <h2 className="typo-heading-md font-extrabold text-text-primary tracking-tight">
          AI 과거 매매 백테스팅 성과
        </h2>
        <p className="typo-body-md font-medium text-text-secondary tracking-tight">
          최근 1년간(2025~현재) {stockName} 매매 요약
        </p>
      </div>

      {/* Best Trade */}
      <div className="flex flex-col gap-6 border-b border-border-primary pb-6 md:pb-10">
        {/* Badge row */}
        <div className="flex items-center gap-2">
          {/* 추후 bg-bg-interactive-danger (#E7000B) 추가되면 변경 예정 */}
          <span
            className="inline-flex typo-body-md items-center px-2 py-1 rounded font-semibold text-white tracking-tight bg-bg-danger-bold"
            style={{
              boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            Best Trade
          </span>
          <span className="typo-body-lg font-semibold text-text-primary">
            최고 수익률 기록
          </span>
        </div>

        {/* Best trade content: left value + right prices */}
        <div className="flex items-end justify-between pr-3">
          {/* Left: return rate + period */}
          <div className="flex flex-1 flex-col gap-3">
            <p
              className="typo-heading-2xl font-extrabold tracking-tight"
              style={{ color: (bestTrade.returnRate ?? 0) >= 0 ? "var(--color-text-danger)" : "var(--color-text-info)" }}
            >
              {(bestTrade.returnRate ?? 0) >= 0 ? "+" : ""}{(bestTrade.returnRate ?? 0).toFixed(2)}%
            </p>
            <div className="text-sm font-medium tracking-tight leading-5">
              {/* Mobile: 2 lines */}
              <div className="md:hidden">
                <p className="typo-body-md tracking-tight">
                  <span className="text-text-secondary">보유 기간: </span>
                  <span className="text-text-primary">{bestTrade.holdingDays}일</span>
                </p>
                <p className="text-text-secondary">({bestTrade.period})</p>
              </div>
              {/* Desktop: 1 line */}
              <p className="hidden md:block">
                <span className="text-[color:var(--color-text-secondary)]">
                  보유 기간:{" "}
                </span>
                <span className="text-[color:var(--color-text-primary)]">
                  {bestTrade.holdingDays}일
                </span>
                <span className="text-[color:var(--color-text-secondary)]">
                  {" "}
                  ({bestTrade.period})
                </span>
              </p>
            </div>
          </div>

          {/* Right: buy/sell prices with vertical divider */}
          <div className="flex flex-1 items-center justify-end gap-3 md:gap-12">
            <div className="flex flex-col gap-1">
              <p className="typo-body-md font-semibold text-text-tertiary tracking-tight">
                매수 단가
              </p>
              <p className="typo-body-lg font-semibold text-text-primary">
                {(bestTrade.buyPrice ?? 0).toLocaleString()}원
              </p>
            </div>
            <div
              className="shrink-0"
              style={{
                width: 1,
                height: 40,
                backgroundColor: "var(--color-icon-disabled)",
              }}
            />
            <div className="flex flex-col gap-1">
              <p className="typo-body-md font-semibold text-text-tertiary tracking-tight">
                매도 단가
              </p>
              <p className="typo-body-lg font-semibold text-text-primary">
                {(bestTrade.sellPrice ?? 0).toLocaleString()}원
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex border-b border-border-primary pb-6">
        {/* 최근 1년 누적 수익률 */}
        <div className="flex flex-1 flex-col gap-1">
          <p className="pb-1 typo-body-md font-semibold text-text-tertiary tracking-tight">
            최근 1년 평균 수익률
          </p>
          <p
            className="typo-heading-lg font-extrabold tracking-tight"
            style={{ color: (stats.averageReturn1y ?? 0) >= 0 ? "var(--color-text-danger)" : "var(--color-text-info)" }}
          >
            {(stats.averageReturn1y ?? 0) >= 0 ? "+" : ""}{(stats.averageReturn1y ?? 0).toFixed(2)}%
          </p>
        </div>

        {/* 최근 1년 매매 횟수 */}
        <div className="flex flex-1 flex-col gap-1">
          <p className="pb-1 typo-body-md font-semibold text-text-tertiary tracking-tight">
            최근 1년 매매 횟수
          </p>
          <p className="typo-heading-lg font-extrabold text-text-primary tracking-tight">
            {stats.oneYearTradeCount}회
          </p>
        </div>

        {/* 전체 기간 매매 횟수 */}
        <div className="flex flex-1 flex-col gap-1">
          <p className="pb-1 typo-body-md font-semibold text-text-tertiary tracking-tight">
            전체 기간 매매 횟수
          </p>
          <p className="typo-heading-lg font-extrabold text-text-primary tracking-tight">
            {stats.allTimeTradeCount}회
          </p>
          <p className="typo-body-sm font-medium text-text-tertiary tracking-tight">
            ({stats.allTimeSince})
          </p>
        </div>
      </div>
    </div>
  );
}
