import Link from "next/link";
import type { NewsItem } from "../types/news";
import { formatNewsRelativeTime } from "../utils/newsFormatters";
import { getNewsStockTicker } from "../utils/newsConstants";

type Props = {
  item: NewsItem;
};

export default function NewsArticleCard({ item }: Props) {
  return (
    <article className="rounded-2xl px-4 py-6 transition-colors hover:bg-[color:var(--color-bg-secondary)]">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {item.relatedStocks.slice(0, 3).map((stock) => (
            <Link
              key={`${item.id}-${stock}`}
              href={`/stocks/${getNewsStockTicker(stock) ?? stock}`}
              className="typo-news-tag inline-flex rounded-md bg-[color:var(--color-bg-info-subtle)] px-2 py-1 text-[color:var(--color-text-info)] transition-opacity hover:opacity-80"
            >
              {stock}
            </Link>
          ))}
        </div>

        <h3 className="text-lg font-extrabold leading-6 text-[color:var(--color-text-primary)] md:text-xl">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="transition-opacity hover:opacity-80"
          >
            {item.title}
          </a>
        </h3>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)] md:text-sm md:leading-5">
            {item.publisher}
          </span>
          <span className="h-1 w-1 rounded-full bg-[color:var(--color-icon-disabled)]" aria-hidden={true} />
          <span className="text-[10px] font-normal leading-4 text-[color:var(--color-text-tertiary)] md:text-xs">
            {formatNewsRelativeTime(item.publishedAt)}
          </span>
        </div>
      </div>
    </article>
  );
}
