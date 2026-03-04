import ReportIndexList from "./components/ReportIndexList";

export default function ReportsPage() {
  return (
    <main className="stack">
      <section className="card stack">
        <h1>AI 리포트 목록</h1>
        <p className="muted">ML + 토론 결과를 종목별로 조회하는 시작 페이지입니다.</p>
      </section>

      <section className="card stack">
        <ReportIndexList />
      </section>
    </main>
  );
}
