import { cookies } from "next/headers";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/shared/lib/getQueryClient";
import { AUTH_ACCESS_TOKEN_COOKIE_NAME } from "@/app/api/auth/utils";
import ProtectedPage from "@/shared/components/ProtectedPage";
import { serverGetDebateReports, serverGetInvestmentPerformance, serverGetTradeHistory, serverGetStockBasicInfo } from "../api/serverFetch";
import ReportsDetailPageClient from "./ReportsDetailPageClient";

type PageProps = {
  params: Promise<{
    stockId: string;
  }>;
};

export default async function ReportsDetailPage({ params }: PageProps) {
  const { stockId } = await params;
  const queryClient = getQueryClient();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_TOKEN_COOKIE_NAME)?.value;

  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ["stock-basic-info", stockId],
      queryFn: () => serverGetStockBasicInfo(stockId, accessToken),
    }),
    queryClient.prefetchQuery({
      queryKey: ["report-detail", "debate-reports", stockId],
      queryFn: () => serverGetDebateReports(stockId, accessToken),
    }),
    queryClient.prefetchQuery({
      queryKey: ["report-detail", "investment-performance", stockId],
      queryFn: () => serverGetInvestmentPerformance(stockId, accessToken),
    }),
    queryClient.prefetchQuery({
      queryKey: ["report-detail", "trade-history", stockId, 0, 100],
      queryFn: () => serverGetTradeHistory(stockId, accessToken),
    }),
  ]);

  return (
    <ProtectedPage>
      <HydrationBoundary
        state={dehydrate(queryClient, {
          shouldDehydrateQuery: (query) => query.state.status === "success",
        })}
      >
        <ReportsDetailPageClient stockId={stockId} />
      </HydrationBoundary>
    </ProtectedPage>
  );
}
