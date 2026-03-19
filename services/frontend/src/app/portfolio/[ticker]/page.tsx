import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/shared/lib/getQueryClient";
import { getStockReport } from "./api/getStockReport";
import { getStockPerformance } from "./api/getStockPerformance";
import { getStockTrades } from "./api/getStockTrades";
import PortfolioStockDetailClient from "./PortfolioStockDetailClient";

type PageProps = {
  params: Promise<{ ticker: string }>;
};

export default async function PortfolioStockDetailPage({ params }: PageProps) {
  const { ticker } = await params;
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["portfolio-stock", "report", ticker, undefined, undefined],
      queryFn: () => getStockReport(ticker),
    }),
    queryClient.prefetchQuery({
      queryKey: ["portfolio-stock", "performance", ticker],
      queryFn: () => getStockPerformance(ticker),
    }),
    queryClient.prefetchQuery({
      queryKey: ["portfolio-stock", "trades", ticker, undefined, undefined],
      queryFn: () => getStockTrades(ticker),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PortfolioStockDetailClient ticker={ticker} />
    </HydrationBoundary>
  );
}
