"use client";

import SignalList from "./components/SignalList";
import { useSignals } from "./hooks/useSignals";

export default function SignalsPage() {
  const { items, isLoading, error } = useSignals();

  return (
    <main className="stack">
      <section className="card stack">
        <h1>AI 매매신호</h1>
        <p className="muted">보일러플레이트: 목록/필터/정렬/더보기 기능은 후속 구현 대상</p>
      </section>

      <section className="card stack">
        {isLoading ? <p>매매신호 로딩 중...</p> : null}
        {error ? <p className="badge badge--danger">{error}</p> : null}
        {!isLoading && !error ? <SignalList items={items} /> : null}
      </section>
    </main>
  );
}
