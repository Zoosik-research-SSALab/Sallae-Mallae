import NewsPageClient from "./components/NewsPageClient";

type Props = {
  searchParams: Promise<{
    keyword?: string;
  }>;
};

export default async function NewsPage({ searchParams }: Props) {
  const { keyword } = await searchParams;
  const normalizedKeyword = keyword?.trim() ?? "";

  return <NewsPageClient key={normalizedKeyword || "news-page"} initialKeyword={normalizedKeyword} />;
}
