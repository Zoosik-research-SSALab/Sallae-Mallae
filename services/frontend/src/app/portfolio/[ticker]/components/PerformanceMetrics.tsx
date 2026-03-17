type Props = {
  totalPnl: number;
  returnRate: number;
  holdingCount: number;
  investmentPrincipal: number;
  buyDate: string;
  holdingDays: number;
  buyPrice: number;
  currentPrice: number;
};

function formatNumber(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function PerformanceMetrics({
  totalPnl,
  returnRate,
  holdingCount,
  investmentPrincipal,
  buyDate,
  holdingDays,
  buyPrice,
  currentPrice,
}: Props) {
  const isPositive = totalPnl >= 0;
  const pnlColor = isPositive
    ? "var(--color-text-danger)"
    : "var(--color-text-info)";
  const sign = isPositive ? "+" : "";

  return (
    <div className="flex flex-col gap-3">
      {/* === Top section === */}
      {/* Mobile: centered vertical stack */}
      {/* Desktop: horizontal, PnL left + return rate right */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        {/* Total PnL */}
        <div className="flex flex-col items-center gap-2 md:items-start">
          <p className="text-sm font-semibold text-[color:var(--color-text-tertiary)] tracking-tight">
            총 평가 손익
          </p>
          <p
            className="font-extrabold tracking-tight"
            style={{ color: pnlColor, fontSize: 48, lineHeight: "56px" }}
          >
            {sign}
            {formatNumber(totalPnl)}원
          </p>
        </div>

        <div className="flex md:block">
          {/* 현재 수익률 */}
          <div className="flex flex-1 flex-col items-center justify-center gap-2 md:items-end">
            <p className="text-sm font-semibold text-[color:var(--color-text-tertiary)] tracking-tight">
              현재 수익률
            </p>
            <p
              className="font-black tracking-tight"
              style={{ color: pnlColor, fontSize: 32, lineHeight: "32px" }}
            >
              {sign}
              {returnRate.toFixed(2)}%
            </p>
          </div>

          {/* 보유 수량 — mobile only (desktop에서는 하단 4컬럼으로 이동) */}
          <div className="flex flex-1 flex-col items-center justify-center gap-1 md:hidden">
            <p className="pb-1 text-sm font-semibold text-[color:var(--color-text-tertiary)] tracking-tight">
              보유 수량
            </p>
            <p className="text-xl font-extrabold text-[color:var(--color-text-primary)] tracking-tight leading-6">
              {holdingCount}주
            </p>
            <p className="text-sm font-semibold text-[color:var(--color-text-secondary)] tracking-tight">
              투자원금 {formatNumber(investmentPrincipal)}원
            </p>
          </div>
        </div>
      </div>

      {/* === Bottom row === */}
      {/* Mobile: 3 columns (매수 일자, 매수 단가, 현재가), centered */}
      {/* Desktop: 4 columns (+ 보유 수량), left-aligned */}
      <div className="flex gap-6 border-b border-[color:var(--color-border-primary)] py-6 md:py-10">
        {/* 매수 일자 */}
        <div className="flex flex-1 flex-col items-center gap-1 md:items-start">
          <p className="pb-1 text-sm font-semibold text-[color:var(--color-text-tertiary)] tracking-tight">
            매수 일자
          </p>
          <p className="text-xl font-extrabold text-[color:var(--color-text-primary)] tracking-tight leading-6">
            {buyDate}
          </p>
          <p className="text-sm font-semibold text-[color:var(--color-text-info)] tracking-tight">
            보유 {holdingDays}일째
          </p>
        </div>

        {/* 매수 단가 */}
        <div className="flex flex-1 flex-col items-center gap-1 md:items-start">
          <p className="pb-1 text-sm font-semibold text-[color:var(--color-text-tertiary)] tracking-tight">
            매수 단가
          </p>
          <p className="text-xl font-extrabold text-[color:var(--color-text-primary)] tracking-tight leading-6">
            {formatNumber(buyPrice)}원
          </p>
        </div>

        {/* 현재가 */}
        <div className="flex flex-1 flex-col items-center gap-1 md:items-start">
          <p className="pb-1 text-sm font-semibold text-[color:var(--color-text-tertiary)] tracking-tight">
            현재가
          </p>
          <p className="text-xl font-extrabold text-[color:var(--color-text-primary)] tracking-tight leading-6">
            {formatNumber(currentPrice)}원
          </p>
        </div>

        {/* 보유 수량 — desktop only (모바일에서는 상단에 표시) */}
        <div className="hidden md:flex flex-1 flex-col items-start gap-1">
          <p className="pb-1 text-sm font-semibold text-[color:var(--color-text-tertiary)] tracking-tight">
            보유 수량
          </p>
          <p className="text-xl font-extrabold text-[color:var(--color-text-primary)] tracking-tight leading-6">
            {holdingCount}주
          </p>
          <p className="text-sm font-semibold text-[color:var(--color-text-secondary)] tracking-tight">
            투자원금 {formatNumber(investmentPrincipal)}원
          </p>
        </div>
      </div>
    </div>
  );
}
