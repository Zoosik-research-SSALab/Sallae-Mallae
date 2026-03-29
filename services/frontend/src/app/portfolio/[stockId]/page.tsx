import { cookies } from "next/headers";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/shared/lib/getQueryClient";
import { AUTH_ACCESS_TOKEN_COOKIE_NAME } from "@/app/api/auth/utils";
import { serverGetStockReport, serverGetStockPerformance, serverGetStockTrades } from "./api/serverFetch";
import PortfolioStockDetailClient from "./PortfolioStockDetailClient";
import ProtectedPage from "@/shared/components/ProtectedPage";

type PageProps = {
  params: Promise<{ stockId: string }>;
};

export default async function PortfolioStockDetailPage({ params }: PageProps) {
  const { stockId } = await params;
  const queryClient = getQueryClient();
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_TOKEN_COOKIE_NAME)?.value;

  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ["portfolio-stock", "report", stockId, undefined, undefined],
      queryFn: () => serverGetStockReport(stockId, accessToken),
    }),
    queryClient.prefetchQuery({
      queryKey: ["portfolio-stock", "performance", stockId],
      queryFn: () => serverGetStockPerformance(stockId, accessToken),
    }),
    queryClient.prefetchQuery({
      queryKey: ["portfolio-stock", "trades", stockId, undefined, undefined],
      queryFn: () => serverGetStockTrades(stockId, accessToken),
    }),
  ]);

  return (
    <ProtectedPage>
      <HydrationBoundary
        state={dehydrate(queryClient, {
          shouldDehydrateQuery: (query) => query.state.status === "success",
        })}
      >
        <PortfolioStockDetailClient stockId={stockId} />
      </HydrationBoundary>
    </ProtectedPage>
  );
}
