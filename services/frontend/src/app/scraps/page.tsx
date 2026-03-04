"use client";

import ScrapList from "./components/ScrapList";
import { useScraps } from "./hooks/useScraps";

export default function ScrapsPage() {
  const { items, isLoading } = useScraps();

  return (
    <main className="stack">
      <section className="card stack">
        <h1>스크랩 목록</h1>
        <p className="muted">보일러플레이트: 관심종목 추가/제거/일괄현황 기능은 후속 구현</p>
      </section>
      <section className="card stack">
        {isLoading ? <p>스크랩 로딩 중...</p> : <ScrapList items={items} />}
      </section>
    </main>
  );
}
