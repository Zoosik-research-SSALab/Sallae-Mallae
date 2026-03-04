import type { ChairmanPortfolio } from "../_api/getChairmanPortfolio";

type Props = {
  item: ChairmanPortfolio;
};

export default function PortfolioSummaryCard({ item }: Props) {
  const winRate = item.totalTrades === 0 ? 0 : (item.winningTrades / item.totalTrades) * 100;

  return (
    <section className="card stack">
      <div className="row-between">
        <h2>{item.name}</h2>
        <span className="badge">출처: {item.source}</span>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi__label">누적 수익률</div>
          <div className="kpi__value">{item.cumulativeReturn.toFixed(2)}%</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">총 매매 횟수</div>
          <div className="kpi__value">{item.totalTrades}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">승률</div>
          <div className="kpi__value">{winRate.toFixed(1)}%</div>
        </div>
      </div>
    </section>
  );
}
