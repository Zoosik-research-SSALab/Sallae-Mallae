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
          <span className="inline-flex items-center px-2 py-1 rounded-md typo-body-sm font-semibold bg-(--color-bg-info-subtle) text-(--color-text-info)">
            AI 포트폴리오 편입 종목
          </span>
        )}
        <span className="typo-body-md text-(--color-text-tertiary) tracking-(--letter-spacing-tight)">
          {ticker}
        </span>
      </div>
      <h1 className="typo-heading-3xl text-(--color-text-primary)">{name}</h1>
      <p className="typo-body-md text-(--color-text-secondary) tracking-(--letter-spacing-tight)">
        {description}
      </p>
    </div>
  );
}
