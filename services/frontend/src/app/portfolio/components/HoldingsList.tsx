import type { PortfolioHolding } from "../api/getChairmanPortfolio";
import Badge from "@/shared/ui/Badge";

type Props = {
  items: PortfolioHolding[];
};

export default function HoldingsList({ items }: Props) {
  return (
    <section className="card stack">
      <h3 className="heading-reset">현재 보유 종목</h3>
      <div className="list">
        {items.map((holding) => (
          <article key={holding.stockId} className="list-item row-between">
            <div className="stack" style={{ gap: 2 }}>
              <strong>
                {holding.stockName} <span className="muted">({holding.ticker})</span>
              </strong>
              <span className="muted">비중 {holding.portfolioWeight.toFixed(2)}%</span>
            </div>
            <Badge tone={holding.returnRate >= 0 ? "ok" : "danger"}>
              {holding.returnRate >= 0 ? "+" : ""}
              {holding.returnRate.toFixed(2)}%
            </Badge>
          </article>
        ))}
      </div>
    </section>
  );
}
