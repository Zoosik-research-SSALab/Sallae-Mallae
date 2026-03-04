"use client";

import HoldingsList from "./components/HoldingsList";
import PerformanceList from "./components/PerformanceList";
import PortfolioSummaryCard from "./components/PortfolioSummaryCard";
import { useChairmanPortfolio } from "./hooks/useChairmanPortfolio";

export default function PortfolioPage() {
  const { item, isLoading } = useChairmanPortfolio();

  return (
    <main className="stack">
      <section className="card stack">
        <h1>전체 의장 포트폴리오</h1>
        <p className="muted">기능 명세 반영 페이지. 실제 집계 API 연결 전까지 fallback 데이터로 표시됩니다.</p>
      </section>

      {isLoading ? <p>포트폴리오 로딩 중...</p> : null}
      {item ? (
        <>
          <PortfolioSummaryCard item={item} />
          <HoldingsList items={item.holdings} />
          <PerformanceList items={item.performance} />
        </>
      ) : null}
    </main>
  );
}
