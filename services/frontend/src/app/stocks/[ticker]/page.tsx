"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import AlertSettingCard from "./components/AlertSettingCard";
import StockDetailCard from "./components/StockDetailCard";
import { useStockDetail } from "./hooks/useStockDetail";

export default function StockDetailPage() {
  const params = useParams<{ ticker: string }>();
  const ticker = params.ticker ?? "";
  const { item, isLoading, error } = useStockDetail(ticker);

  return (
    <main className="stack">
      <div className="row-between">
        <h1>종목 상세</h1>
        <div className="row">
          <Link href="/stocks" className="link">
            목록
          </Link>
          <Link href={`/reports/${ticker}`} className="link">
            리포트
          </Link>
        </div>
      </div>

      {isLoading ? <p>상세 로딩 중...</p> : null}
      {error ? <p className="badge badge--danger">{error}</p> : null}
      {item ? <StockDetailCard item={item} /> : null}
      <AlertSettingCard ticker={ticker} />
    </main>
  );
}
