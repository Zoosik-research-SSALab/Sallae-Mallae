"use client";

import StockList from "./components/StockList";
import { useStocks } from "./hooks/useStocks";
import Badge from "@/shared/ui/Badge";

export default function StocksPage() {
  const { items, isLoading, error } = useStocks();

  return (
    <main className="stack">
      <section className="card stack">
        <h1>종목 목록</h1>
        <p className="muted">ERD 기준 stocks 도메인 시작점입니다.</p>
      </section>

      <section className="card stack">
        {isLoading ? <p>종목 목록 로딩 중...</p> : null}
        {error ? <Badge tone="danger">{error}</Badge> : null}
        {!isLoading && !error ? <StockList items={items} /> : null}
      </section>
    </main>
  );
}
