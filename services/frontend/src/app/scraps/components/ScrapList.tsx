import type { ScrapItem } from "../_api/getScraps";

type Props = {
  items: ScrapItem[];
};

export default function ScrapList({ items }: Props) {
  return (
    <div className="list">
      {items.map((item) => (
        <article key={item.stockId} className="list-item row-between">
          <div className="stack" style={{ gap: 2 }}>
            <strong>
              {item.name} <span className="muted">({item.ticker})</span>
            </strong>
            <p className="muted">관심종목 알림: {item.isNotiEnabled ? "ON" : "OFF"}</p>
          </div>
          <button className="button" type="button" disabled>
            제거
          </button>
        </article>
      ))}
    </div>
  );
}
