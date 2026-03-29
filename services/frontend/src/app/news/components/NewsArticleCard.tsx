import type { NewsItem } from "../types/news";
import { formatNewsRelativeTime } from "../utils/newsFormatters";

type Props = {
  item: NewsItem;
  onSelect?: (newsId: number) => void;
};

export default function NewsArticleCard({ item, onSelect }: Props) {
  const isInteractive = typeof onSelect === "function";

  const handleSelect = () => {
    onSelect?.(item.id);
  };

  return (
    <article
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? handleSelect : undefined}
      onKeyDown={isInteractive ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect();
        }
      } : undefined}
      className={`rounded-2xl px-4 py-6 transition-colors ${
        isInteractive
          ? "cursor-pointer hover:bg-[color:var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-base)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg-primary)]"
          : "hover:bg-[color:var(--color-bg-secondary)]"
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {item.relatedStocks.slice(0, 3).map((stock) => (
            <span
              key={`${item.id}-${stock}`}
              className="typo-news-tag inline-flex rounded-md bg-[color:var(--color-bg-info-subtle)] px-2 py-1 text-[color:var(--color-text-info)]"
            >
              {stock}
            </span>
          ))}
        </div>

        <h3 className="text-lg font-extrabold leading-6 text-[color:var(--color-text-primary)] md:text-xl">
          {!isInteractive && item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" className="transition-opacity hover:opacity-80">
              {item.title}
            </a>
          ) : (
            <span>{item.title}</span>
          )}
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
