import Link from "next/link";

const seededSymbols = ["005930", "000660", "035420", "005380", "051910", "035720"];

export default function ReportIndexList() {
  return (
    <div className="list">
      {seededSymbols.map((symbol) => (
        <article key={symbol} className="list-item row-between">
          <div className="stack" style={{ gap: 2 }}>
            <strong>{symbol}</strong>
            <p className="muted">최신 AI 리포트 조회</p>
          </div>
          <Link href={`/reports/${symbol}`} className="link">
            상세 보기
          </Link>
        </article>
      ))}
    </div>
  );
}
