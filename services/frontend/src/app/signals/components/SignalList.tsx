import type { SignalItem } from "../_api/getSignals";

type Props = {
  items: SignalItem[];
};

export default function SignalList({ items }: Props) {
  if (items.length === 0) {
    return <p className="muted">매매신호 데이터가 없습니다.</p>;
  }

  return (
    <div className="list">
      {items.map((item) => (
        <article key={item.id} className="list-item row-between">
          <div className="stack" style={{ gap: 2 }}>
            <strong>{item.ticker}</strong>
            <p className="muted">신뢰도 {(item.confidence * 100).toFixed(1)}%</p>
          </div>
          <span className="badge">{item.signal}</span>
        </article>
      ))}
    </div>
  );
}
