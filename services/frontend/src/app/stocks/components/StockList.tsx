import Link from "next/link";
import type { StockSummary } from "../_api/getStocks";

type Props = {
  items: StockSummary[];
};

export default function StockList({ items }: Props) {
  if (items.length === 0) {
    return <p className="muted">현재 표시 가능한 종목이 없습니다. (DB 연동 후 자동 표시)</p>;
  }

  return (
    <div className="list">
      {items.map((item) => (
        <article key={item.id} className="list-item row-between">
          <div className="stack" style={{ gap: 2 }}>
            <strong>
              {item.name} <span className="muted">({item.ticker})</span>
            </strong>
            <span className="badge">{item.marketType}</span>
          </div>

          <div className="row" style={{ flexWrap: "wrap" }}>
            <Link className="link" href={`/stocks/${item.ticker}`}>
              상세
            </Link>
            <Link className="link" href={`/reports/${item.ticker}`}>
              리포트
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
