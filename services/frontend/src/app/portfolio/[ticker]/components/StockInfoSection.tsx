type Props = {
  ticker: string;
  name: string;
  description: string;
  isAiPortfolio: boolean;
};

export default function StockInfoSection({
  ticker,
  name,
  description,
  isAiPortfolio,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {isAiPortfolio && (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)]">
            AI 포트폴리오 편입 종목
          </span>
        )}
        <span className="text-xs text-[color:var(--color-text-secondary)]">
          {ticker}
        </span>
      </div>
      <h1 className="text-4xl font-extrabold text-[color:var(--color-text-primary)] leading-tight">
        {name}
      </h1>
      <p className="text-xs text-[color:var(--color-text-secondary)]">
        {description}
      </p>
    </div>
  );
}
