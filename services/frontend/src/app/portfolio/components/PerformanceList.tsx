import type { DailyPerformance } from "../api/getChairmanPortfolio";
import Badge from "@/shared/ui/Badge";

type Props = {
  items: DailyPerformance[];
};

export default function PerformanceList({ items }: Props) {
  return (
    <section className="card stack">
      <h3 className="heading-reset">일별 성과</h3>
      <div className="list">
        {items.map((entry) => (
          <article key={entry.recordDate} className="list-item row-between">
            <strong>{entry.recordDate}</strong>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <Badge>일일 {entry.dailyReturn.toFixed(2)}%</Badge>
              <Badge>누적 {entry.cumulativeReturn.toFixed(2)}%</Badge>
              <Badge>MDD {entry.mdd.toFixed(2)}%</Badge>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
