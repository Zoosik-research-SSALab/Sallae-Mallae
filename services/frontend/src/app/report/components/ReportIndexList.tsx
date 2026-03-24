import Link from "next/link";

const seededStockIds = ["005930", "000660", "035420", "005380", "051910", "035720"];

export default function ReportIndexList() {
  return (
    <div className="list">
      {seededStockIds.map((stockId) => (
        <article key={stockId} className="list-item row-between">
          <div className="stack" style={{ gap: 2 }}>
            <strong>{stockId}</strong>
            <p className="muted">최신 AI 리포트 조회</p>
          </div>
          <Link href={`/report/${stockId}`} className="link">
            상세 보기
          </Link>
        </article>
      ))}
    </div>
  );
}
