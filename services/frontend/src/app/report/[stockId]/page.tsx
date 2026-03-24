import { notFound } from "next/navigation";
import { hasMockTradeHistory } from "@/app/report/utils/mockReportPageData";
import { hasMockDebateReports } from "@/app/report/utils/mockDebateReportData";
import { hasMockStockSeed } from "@/app/stocks/utils/mockStockDetailData";
import ReportsDetailPageClient from "./ReportsDetailPageClient";

type PageProps = {
  params: Promise<{
    stockId: string;
  }>;
};

export default async function ReportsDetailPage({ params }: PageProps) {
  const { stockId: rawStockId } = await params;
  const stockId = decodeURIComponent(rawStockId ?? "").trim();

  if (!stockId) {
    notFound();
  }

  if (shouldUseMockMode() && (!hasMockStockSeed(stockId) || !hasMockDebateReports(stockId) || !hasMockTradeHistory(stockId))) {
    notFound();
  }

  return <ReportsDetailPageClient stockId={stockId} />;
}

function shouldUseMockMode() {
  const explicit = process.env.NEXT_PUBLIC_USE_API_MOCK?.trim().toLowerCase();
  if (explicit === "true") {
    return true;
  }

  if (explicit === "false") {
    return false;
  }

  const raw = process.env.NEXT_PUBLIC_API_MOCKING?.trim().toLowerCase();
  return !(raw === "false" || raw === "disabled");
}
