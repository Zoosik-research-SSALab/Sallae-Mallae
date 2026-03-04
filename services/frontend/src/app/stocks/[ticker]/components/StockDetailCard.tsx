import type { StockDetail } from "../_api/getStockDetail";

type Props = {
  item: StockDetail;
};

export default function StockDetailCard({ item }: Props) {
  return (
    <section className="card stack">
      <div className="row-between">
        <h2>
          {item.name} <span className="muted">({item.ticker})</span>
        </h2>
        <span className="badge">{item.marketType}</span>
      </div>
      <p className="muted">
        종목 상세 탭(뉴스/공시/재무/리포트)은 기능 개발 단계에서 이 페이지 하위 컴포넌트로 확장합니다.
      </p>
    </section>
  );
}
