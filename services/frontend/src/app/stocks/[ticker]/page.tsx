import StockDetailPageClient from "./StockDetailPageClient";

type PageProps = {
  params: Promise<{
    ticker: string;
  }>;
};

export default async function StockDetailPage({ params }: PageProps) {
  const { ticker: stockId } = await params;

  return <StockDetailPageClient stockId={stockId} />;
}
