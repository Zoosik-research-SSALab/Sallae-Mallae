"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import ReportSummaryCard from "./components/ReportSummaryCard";
import { useSymbolLatestReport } from "./hooks/useSymbolLatestReport";
import ProtectedPage from "@/shared/components/ProtectedPage";
import Badge from "@/shared/ui/Badge";

export default function ReportDetailPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol ?? "";

  const { report, isLoading, error } = useSymbolLatestReport(symbol);

  return (
    <ProtectedPage>
      <main className="stack">
        <div className="row-between">
          <h1 className="heading-reset">리포트 상세</h1>
          <div className="row">
            <Link href="/reports" className="link">
              목록
            </Link>
            <Link href={`/stocks/${symbol}`} className="link">
              종목 상세
            </Link>
          </div>
        </div>

        {isLoading ? <p>리포트 로딩 중...</p> : null}
        {error ? <Badge tone="danger">{error}</Badge> : null}
        {report ? <ReportSummaryCard report={report} /> : null}
      </main>
    </ProtectedPage>
  );
}
