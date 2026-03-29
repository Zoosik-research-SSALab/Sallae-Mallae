import type { ScrapItem } from "../api/getScraps";
import Button from "@/shared/ui/Button";

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
          <Button disabled>
            제거
          </Button>
        </article>
      ))}
    </div>
  );
}
