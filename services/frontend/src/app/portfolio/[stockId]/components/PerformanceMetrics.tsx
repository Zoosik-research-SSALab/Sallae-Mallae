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

function formatNumber(n: number | undefined | null) {
  return (n ?? 0).toLocaleString("ko-KR");
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
          <p className="typo-body-md font-semibold text-text-tertiary tracking-tight">
            총 평가 손익
          </p>
          <p
            className="typo-heading-3xl font-extrabold tracking-tight"
            style={{ color: pnlColor }}
          >
            {sign}
            {formatNumber(totalPnl)}원
          </p>
        </div>

        <div className="flex md:block">
          {/* 현재 수익률 */}
          <div className="flex flex-1 flex-col items-center justify-center gap-2 md:items-end">
            <p className="typo-body-md font-semibold text-text-tertiary tracking-tight">
              현재 수익률
            </p>
            <p
              className=" text-[32px] font-black tracking-[-0.32px] leading-8"
              style={{ color: pnlColor }}
            >
              {sign}
              {returnRate.toFixed(2)}%
            </p>
          </div>

          {/* 보유 수량 — mobile only (desktop에서는 하단 4컬럼으로 이동) */}
          <div className="flex flex-1 flex-col items-center justify-center gap-1 md:hidden">
            <p className="typo-body-md pb-1 font-semibold text-text-tertiary tracking-tight">
              보유 수량
            </p>
            <p className="typo-heading-sm font-extrabold text-text-primary tracking-tight">
              {holdingCount}주
            </p>
            <p className="typo-body-md font-semibold text-text-secondary tracking-tight">
              투자원금 {formatNumber(investmentPrincipal)}원
            </p>
          </div>
        </div>
      </div>

      {/* === Bottom row === */}
      {/* Mobile: 3 columns (매수 일자, 매수 단가, 현재가), centered */}
      {/* Desktop: 4 columns (+ 보유 수량), left-aligned */}
      <div className="flex gap-6 border-b border-border-primary py-6 md:py-10">
        {/* 매수 일자 */}
        <div className="flex flex-1 flex-col items-center gap-1 md:items-start">
          <p className="typo-body-md pb-1 font-semibold text-text-tertiary tracking-tight">
            매수 일자
          </p>
          <p className="typo-heading-sm font-extrabold text-text-primary tracking-tight">
            {buyDate}
          </p>
          <p className="typo-body-md font-semibold text-text-info tracking-tight">
            보유 {holdingDays}일째
          </p>
        </div>

        {/* 매수 단가 */}
        <div className="flex flex-1 flex-col items-center gap-1 md:items-start">
          <p className="typo-body-md pb-1 font-semibold text-text-tertiary tracking-tight">
            매수 단가
          </p>
          <p className="typo-heading-sm font-extrabold text-text-primary tracking-tight">
            {formatNumber(buyPrice)}원
          </p>
        </div>

        {/* 현재가 */}
        <div className="flex flex-1 flex-col items-center gap-1 md:items-start">
          <p className="typo-body-md pb-1 font-semibold text-text-tertiary tracking-tight">
            현재가
          </p>
          <p className="typo-heading-sm font-extrabold text-text-primary tracking-tight">
            {formatNumber(currentPrice)}원
          </p>
        </div>

        {/* 보유 수량 — desktop only (모바일에서는 상단에 표시) */}
        <div className="hidden md:flex flex-1 flex-col items-start gap-1">
          <p className="typo-body-md pb-1 font-semibold text-text-tertiary tracking-tight">
            보유 수량
          </p>
          <p className="typo-heading-sm font-extrabold text-text-primary tracking-tight">
            {holdingCount}주
          </p>
          <p className="typo-body-md font-semibold text-text-secondary tracking-tight">
            투자원금 {formatNumber(investmentPrincipal)}원
          </p>
        </div>
      </div>
    </div>
  );
}
