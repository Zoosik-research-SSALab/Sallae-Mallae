import StockDetailPageClient from "./StockDetailPageClient";

type PageProps = {
  params: Promise<{
    ticker: string;
  }>;
};

export default async function StockDetailPage({ params }: PageProps) {
  const { ticker } = await params;

  return <StockDetailPageClient ticker={ticker} />;
}
