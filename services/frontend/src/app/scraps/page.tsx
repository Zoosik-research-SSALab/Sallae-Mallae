import ScrapsPageClient from "./ScrapsPageClient";

type Props = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export default async function ScrapsPage({ searchParams }: Props) {
  const { page } = await searchParams;

  return <ScrapsPageClient initialPage={page} />;
}
