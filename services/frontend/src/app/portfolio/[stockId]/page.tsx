import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/shared/lib/getQueryClient";
import { getStockReport } from "./api/getStockReport";
import { getStockPerformance } from "./api/getStockPerformance";
import { getStockTrades } from "./api/getStockTrades";
import PortfolioStockDetailClient from "./PortfolioStockDetailClient";
import ProtectedPage from "@/shared/components/ProtectedPage";

type PageProps = {
  params: Promise<{ stockId: string }>;
};

export default async function PortfolioStockDetailPage({ params }: PageProps) {
  const { stockId } = await params;
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["portfolio-stock", "report", stockId, undefined, undefined],
      queryFn: () => getStockReport(stockId),
    }),
    queryClient.prefetchQuery({
      queryKey: ["portfolio-stock", "performance", stockId],
      queryFn: () => getStockPerformance(stockId),
    }),
    queryClient.prefetchQuery({
      queryKey: ["portfolio-stock", "trades", stockId, undefined, undefined],
      queryFn: () => getStockTrades(stockId),
    }),
  ]);

  return (
    <ProtectedPage>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PortfolioStockDetailClient stockId={stockId} />
      </HydrationBoundary>
    </ProtectedPage>
  );
}
