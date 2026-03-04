import type { DailyPerformance } from "../_api/getChairmanPortfolio";

type Props = {
  items: DailyPerformance[];
};

export default function PerformanceList({ items }: Props) {
  return (
    <section className="card stack">
      <h3>일별 성과</h3>
      <div className="list">
        {items.map((entry) => (
          <article key={entry.recordDate} className="list-item row-between">
            <strong>{entry.recordDate}</strong>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <span className="badge">일일 {entry.dailyReturn.toFixed(2)}%</span>
              <span className="badge">누적 {entry.cumulativeReturn.toFixed(2)}%</span>
              <span className="badge">MDD {entry.mdd.toFixed(2)}%</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
