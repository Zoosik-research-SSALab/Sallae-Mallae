import type { StockKeyword, StockKeywordNewsItem } from "@/app/stocks/types/stockDetail";
import { formatRelativePublishedAt } from "../utils/stockDetailFormatters";

type Props = {
  keywords: StockKeyword[];
  news: StockKeywordNewsItem[];
  isLoading: boolean;
};

export default function StockKeywordsNewsSection({ keywords, news, isLoading }: Props) {
  return (
    <section className="border-b border-[color:var(--color-border-primary)] pb-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="typo-heading-sm text-[color:var(--color-text-primary)]">종목 핵심 뉴스</h2>
          <span className="typo-body-sm text-[color:var(--color-text-tertiary)]">더보기</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-8 w-24 animate-pulse rounded-lg bg-[color:var(--color-bg-secondary)]" />
              ))
          : keywords.slice(0, 3).map((keyword, index) => {
                const isAccent = index === 1;

                return (
                  <span
                    key={keyword.id}
                    className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-bold ${
                      isAccent
                        ? "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)]"
                        : "bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-secondary)]"
                    }`}
                  >
                    #{keyword.name}
                  </span>
                );
              })}
        </div>

        <div className="flex flex-col gap-5">
          {isLoading
            ? Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-6 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                  <div className="h-4 w-40 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                </div>
              ))
            : news.slice(0, 3).map((item) => {
                const content = (
                  <>
                    <div className="typo-body-md font-semibold text-[color:var(--color-text-primary)]">{item.title}</div>
                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-[color:var(--color-text-secondary)]">
                      <span>{item.publisher}</span>
                      <span>{formatRelativePublishedAt(item.publishedAt)}</span>
                    </div>
                  </>
                );

                return item.url ? (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl transition-colors hover:bg-[color:var(--color-bg-secondary)]"
                  >
                    {content}
                  </a>
                ) : (
                  <div key={item.id}>{content}</div>
                );
              })}
        </div>
      </div>
    </section>
  );
}
