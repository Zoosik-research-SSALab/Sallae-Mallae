"use client";

interface ReportHeroSectionProps {
  market: string;
  stockId: string;
  benchmarkTime: string;
  companyName: string;
  priceText: string;
  changeText: string;
}

export default function ReportHeroSection({
  market,
  stockId,
  benchmarkTime,
  companyName,
  priceText,
  changeText,
}: ReportHeroSectionProps) {
  return (
    <div className="flex items-start justify-between gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-[color:var(--color-bg-tertiary)] px-2.5 py-1">
            <span className="text-sm font-semibold text-[color:var(--color-text-secondary)]">{market}</span>
          </div>
          <span className="text-sm font-semibold text-[color:var(--color-text-tertiary)]">{stockId}</span>
          <span className="h-5 w-px bg-[color:var(--color-border-primary)]" />
          <span className="text-sm font-medium text-[color:var(--color-text-tertiary)]">{benchmarkTime}</span>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="heading-reset text-6xl font-black leading-[68px] text-[color:var(--color-text-primary)]">
            {companyName}
          </h1>
          <span className="text-[32px] text-[#FB2C36]">♥</span>
        </div>
      </div>

      <div className="flex flex-col items-end justify-end gap-1 self-stretch">
        <div className="text-right text-5xl font-extrabold leading-[56px] text-[color:var(--color-text-primary)]">{priceText}</div>
        <div className="flex items-center gap-1 text-xl font-extrabold text-[color:var(--color-text-danger)]">
          <span>▲</span>
          <span>{changeText}</span>
        </div>
      </div>
    </div>
  );
}
