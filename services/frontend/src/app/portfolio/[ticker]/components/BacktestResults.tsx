import type { BacktestBestTrade, BacktestStats } from "../types/portfolioStockDetail";

type Props = {
  bestTrade: BacktestBestTrade;
  stats: BacktestStats;
  stockName?: string;
};

export default function BacktestResults({ bestTrade, stats, stockName = "SK하이닉스" }: Props) {
  return (
    <div className="flex flex-col gap-8">
      {/* Section header */}
      <div className="flex flex-col gap-1">
        <h2
          className="font-extrabold text-[color:var(--color-text-primary)] tracking-tight"
          style={{ fontSize: 24, lineHeight: "28px" }}
        >
          AI 과거 매매 백테스팅 성과
        </h2>
        <p className="text-sm font-medium text-[color:var(--color-text-secondary)] tracking-tight">
          최근 3년간(2023~2026) {stockName} 매매 요약
        </p>
      </div>

      {/* Best Trade */}
      <div className="flex flex-col gap-6 border-b border-[color:var(--color-border-primary)] pb-6 md:pb-10">
        {/* Badge row */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-2 py-1 rounded text-sm font-semibold text-white tracking-tight"
            style={{
              backgroundColor: "var(--color-red-600)",
              boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            Best Trade
          </span>
          <span className="text-base font-semibold text-[color:var(--color-text-primary)]">
            최고 수익률 기록
          </span>
        </div>

        {/* Best trade content: left value + right prices */}
        <div className="flex items-end justify-between pr-3">
          {/* Left: return rate + period */}
          <div className="flex flex-1 flex-col gap-3">
            <p
              className="font-extrabold text-[color:var(--color-text-danger)] tracking-tight"
              style={{ fontSize: 40, lineHeight: "48px" }}
            >
              +{bestTrade.returnRate}%
            </p>
            <div className="text-sm font-medium tracking-tight leading-5">
              {/* Mobile: 2 lines */}
              <div className="md:hidden">
                <p>
                  <span className="text-[color:var(--color-text-secondary)]">보유 기간: </span>
                  <span className="text-[color:var(--color-text-primary)]">45일</span>
                </p>
                <p className="text-[color:var(--color-text-secondary)]">(23.05.12 ~ 23.06.26)</p>
              </div>
              {/* Desktop: 1 line */}
              <p className="hidden md:block">
                <span className="text-[color:var(--color-text-secondary)]">보유 기간: </span>
                <span className="text-[color:var(--color-text-primary)]">45일</span>
                <span className="text-[color:var(--color-text-secondary)]"> (23.05.12 ~ 23.06.26)</span>
              </p>
            </div>
          </div>

          {/* Right: buy/sell prices with vertical divider */}
          <div className="flex flex-1 items-center justify-end gap-3 md:gap-12">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-[color:var(--color-text-tertiary)] tracking-tight">
                매수 단가
              </p>
              <p className="text-base font-semibold text-[color:var(--color-text-primary)]">
                {bestTrade.buyPrice.toLocaleString()}원
              </p>
            </div>
            <div
              className="shrink-0"
              style={{ width: 1, height: 40, backgroundColor: "var(--color-icon-disabled)" }}
            />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-[color:var(--color-text-tertiary)] tracking-tight">
                매도 단가
              </p>
              <p className="text-base font-semibold text-[color:var(--color-text-primary)]">
                {bestTrade.sellPrice.toLocaleString()}원
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex border-b border-[color:var(--color-border-primary)] pb-6">
        {/* 최근 3년 누적 수익률 */}
        <div className="flex flex-1 flex-col gap-1">
          <p className="pb-1 text-sm font-semibold text-[color:var(--color-text-tertiary)] tracking-tight">
            최근 3년 누적 수익률
          </p>
          <p
            className="font-extrabold text-[color:var(--color-text-danger)] tracking-tight"
            style={{ fontSize: 28, lineHeight: "36px" }}
          >
            +{stats.threeYearReturn}%
          </p>
        </div>

        {/* 최근 3년 매매 횟수 */}
        <div className="flex flex-1 flex-col gap-1">
          <p className="pb-1 text-sm font-semibold text-[color:var(--color-text-tertiary)] tracking-tight">
            최근 3년 매매 횟수
          </p>
          <p
            className="font-extrabold text-[color:var(--color-text-primary)] tracking-tight"
            style={{ fontSize: 28, lineHeight: "36px" }}
          >
            {stats.threeYearTradeCount}회
          </p>
        </div>

        {/* 전체 기간 매매 횟수 */}
        <div className="flex flex-1 flex-col gap-1">
          <p className="pb-1 text-sm font-semibold text-[color:var(--color-text-tertiary)] tracking-tight">
            전체 기간 매매 횟수
          </p>
          <div className="flex items-center gap-1">
            <p
              className="font-extrabold text-[color:var(--color-text-primary)] tracking-tight"
              style={{ fontSize: 28, lineHeight: "36px" }}
            >
              {stats.allTimeTradeCount}회
            </p>
            <span className="text-sm font-medium text-[color:var(--color-text-tertiary)] tracking-tight">
              ({stats.allTimeSince})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
