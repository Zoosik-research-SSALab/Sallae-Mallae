import ScrapsPageClient from "./ScrapsPageClient";
import ProtectedPage from "@/shared/components/ProtectedPage";

type Props = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export default async function ScrapsPage({ searchParams }: Props) {
  const { page } = await searchParams;

  return (
    <ProtectedPage>
      <ScrapsPageClient initialPage={page} />
    </ProtectedPage>
  );
}
