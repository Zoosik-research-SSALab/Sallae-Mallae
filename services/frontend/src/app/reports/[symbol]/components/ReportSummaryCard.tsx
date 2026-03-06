import SignalBadge from "../../components/SignalBadge";
import type { LatestReport } from "../../api/getLatestReport";

type Props = {
  report: LatestReport;
};

export default function ReportSummaryCard({ report }: Props) {
  return (
    <section className="card stack">
      <div className="row-between">
        <h2>{report.ticker} 최신 리포트</h2>
        <SignalBadge signal={report.mlSignal} />
      </div>

      <div className="panel stack">
        <p className="muted">신뢰도</p>
        <strong>{(Number(report.mlConfidence) * 100).toFixed(1)}%</strong>
      </div>

      <div className="panel stack">
        <p className="muted">생성 시각</p>
        <strong>{report.reportTime}</strong>
      </div>

      <div className="panel stack">
        <p className="muted">요약</p>
        <p>{report.note}</p>
      </div>

      <p className="muted">TODO: 토론 라운드/의장 결론/근거 키워드 블록 연결</p>
    </section>
  );
}
