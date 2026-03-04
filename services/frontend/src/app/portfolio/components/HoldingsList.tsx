import type { PortfolioHolding } from "../_api/getChairmanPortfolio";

type Props = {
  items: PortfolioHolding[];
};

export default function HoldingsList({ items }: Props) {
  return (
    <section className="card stack">
      <h3>현재 보유 종목</h3>
      <div className="list">
        {items.map((holding) => (
          <article key={holding.stockId} className="list-item row-between">
            <div className="stack" style={{ gap: 2 }}>
              <strong>
                {holding.stockName} <span className="muted">({holding.ticker})</span>
              </strong>
              <span className="muted">비중 {holding.portfolioWeight.toFixed(2)}%</span>
            </div>
            <span className={`badge ${holding.returnRate >= 0 ? "badge--ok" : "badge--danger"}`}>
              {holding.returnRate >= 0 ? "+" : ""}
              {holding.returnRate.toFixed(2)}%
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
