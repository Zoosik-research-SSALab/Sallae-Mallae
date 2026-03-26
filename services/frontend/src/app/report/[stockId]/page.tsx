import { notFound } from "next/navigation";
import ProtectedPage from "@/shared/components/ProtectedPage";
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

  return (
    <ProtectedPage>
      <ReportsDetailPageClient stockId={stockId} />
    </ProtectedPage>
  );
}
