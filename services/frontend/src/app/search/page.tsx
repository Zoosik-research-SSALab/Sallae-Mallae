import SearchPanel from "./components/SearchPanel";

export default function SearchPage() {
  return (
    <main className="stack">
      <section className="card stack">
        <h1>검색창</h1>
        <p className="muted">보일러플레이트: 자동완성/최근검색/인기검색/기록삭제 기능 연동 전 단계</p>
      </section>
      <SearchPanel />
    </main>
  );
}
