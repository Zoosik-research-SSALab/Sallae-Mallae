import type { WatchlistNewsItem } from "../types/scraps";
import { formatNewsRelativeTime } from "../utils/watchlistDisplay";

type Props = {
  items: WatchlistNewsItem[];
  isLoading: boolean;
};

function NewsSkeletonItem() {
  return (
    <div className="rounded-2xl border-b-2 border-[color:var(--color-border-secondary)] px-2 py-6">
      <div className="h-4 w-28 rounded bg-[color:var(--color-bg-secondary)]" />
      <div className="mt-4 h-6 w-full rounded bg-[color:var(--color-bg-secondary)]" />
      <div className="mt-3 h-16 w-full rounded bg-[color:var(--color-bg-secondary)]" />
      <div className="mt-3 h-4 w-24 rounded bg-[color:var(--color-bg-secondary)]" />
    </div>
  );
}

export default function WatchlistNewsSection({ items, isLoading }: Props) {
  const visibleItems = items.slice(0, 3);

  return (
    <section className="flex w-full flex-col gap-6 pt-10">
      <div className="border-b border-[color:var(--color-border-base)] pb-4">
        <h2 className="typo-heading-md text-[color:var(--color-text-primary)] md:text-[28px] md:leading-9">관심 종목 관련 실시간 뉴스</h2>
      </div>

      <div className="flex flex-col">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => <NewsSkeletonItem key={index} />)
        ) : visibleItems.length > 0 ? (
          visibleItems.map((item, index) => {
            const className = `flex flex-col gap-3 px-2 py-6 transition-colors ${
              index < visibleItems.length - 1 ? "border-b-2 border-[color:var(--color-border-secondary)]" : ""
            } ${item.url ? "cursor-pointer hover:bg-[color:var(--color-bg-secondary)]" : ""}`;

            const content = (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {item.relatedStocks.map((stock) => (
                    <span
                      key={`${item.id}-${stock}`}
                      className="typo-body-xs inline-flex rounded bg-[color:var(--color-bg-info-subtle)] px-2 py-1 font-semibold text-[color:var(--color-text-info)]"
                    >
                      {stock}
                    </span>
                  ))}
                </div>

                <h3 className="typo-heading-sm text-[color:var(--color-text-primary)] md:text-xl md:leading-7">{item.title}</h3>
                <p className="typo-body-sm text-[color:var(--color-text-secondary)] md:text-base md:leading-6">{item.summary}</p>
                <p className="typo-body-xs font-semibold text-[color:var(--color-text-secondary)]">
                  {item.source} · {formatNewsRelativeTime(item.publishedAt)}
                </p>
              </>
            );

            if (item.url) {
              return (
                <a key={item.id} href={item.url} target="_blank" rel="noreferrer noopener" className={className}>
                  {content}
                </a>
              );
            }

            return (
              <article key={item.id} className={className}>
                {content}
              </article>
            );
          })
        ) : (
          <div className="py-10">
            <p className="typo-body-md text-[color:var(--color-text-secondary)]">관심 종목과 연결된 뉴스가 아직 없습니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}
