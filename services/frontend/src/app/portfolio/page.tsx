import PortfolioPageClient from "./PortfolioPageClient";
import ProtectedPage from "@/shared/components/ProtectedPage";

export default function PortfolioPage() {
  return (
    <ProtectedPage>
      <PortfolioPageClient />
    </ProtectedPage>
  );
}
