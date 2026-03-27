import NewsPageClient from "./components/NewsPageClient";

type Props = {
  searchParams: Promise<{
    keyword?: string;
  }>;
};

export default async function NewsPage({ searchParams }: Props) {
  const { keyword } = await searchParams;

  return <NewsPageClient initialKeyword={keyword?.trim() ?? ""} />;
}
