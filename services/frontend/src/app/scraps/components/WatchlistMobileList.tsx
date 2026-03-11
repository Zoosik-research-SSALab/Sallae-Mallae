import Link from "next/link";
import ValueChangeRateText from "@/shared/components/ValueChangeRateText";
import WatchlistHeartButton from "@/shared/components/WatchlistHeartButton";
import type { WatchlistStockItem } from "../types/scraps";
import { formatPriceLabel, formatSignedRateLabel, getRateTextClassName } from "../utils/watchlistDisplay";
import WatchlistPagination from "./WatchlistPagination";
import WatchlistSignalBadge from "./WatchlistSignalBadge";

type Props = {
  items: WatchlistStockItem[];
  pageSize: number;
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onToggleSuccess: (stockId: number, nextIsWatched: boolean) => void;
};

function StockAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--color-bg-interactive-primary)] text-[10px] font-semibold text-[color:var(--color-text-base)] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]">
      {name.slice(0, 2)}
    </div>
  );
}

function MobileSkeletonRow({ index }: { index: number }) {
  return (
    <div key={`watchlist-mobile-skeleton-${index}`} className="border-b border-[color:var(--color-border-secondary)] py-4">
      <div className="h-16 rounded-2xl bg-[color:var(--color-bg-secondary)]" />
    </div>
  );
}

export default function WatchlistMobileList({
  items,
  pageSize,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  onToggleSuccess,
}: Props) {
  return (
    <section className="flex w-full flex-col gap-0 lg:hidden">
      <div className="flex flex-col">
        {isLoading ? (
          Array.from({ length: pageSize }).map((_, index) => <MobileSkeletonRow key={index} index={index} />)
        ) : items.length > 0 ? (
          items.map((item) => (
            <article key={item.stockId} className="border-b border-[color:var(--color-border-secondary)] py-4">
              <div className="flex items-center gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <StockAvatar name={item.name} />

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/stocks/${item.ticker}`}
                      className="typo-body-sm truncate font-semibold text-[color:var(--color-text-primary)] transition-colors hover:text-[color:var(--color-text-interactive-primary)]"
                    >
                      {item.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="typo-body-xs font-semibold text-[color:var(--color-text-tertiary)]">{item.ticker}</span>
                      <WatchlistSignalBadge signal={item.signal} compact />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <div className="flex min-w-[84px] flex-col items-end gap-1">
                    <span className="typo-body-sm font-extrabold text-[color:var(--color-text-primary)]">{formatPriceLabel(item.price)}</span>
                    <ValueChangeRateText
                      value={item.fluctuationRate}
                      padding="x-none"
                      className={`typo-body-xs font-semibold ${getRateTextClassName(item.fluctuationRate)}`}
                    >
                      {formatSignedRateLabel(item.fluctuationRate)}
                    </ValueChangeRateText>
                  </div>

                  <WatchlistHeartButton
                    stockId={item.stockId}
                    stockName={item.name}
                    initialWatched
                    inactiveIconStyle="outline"
                    onToggleSuccess={(nextIsWatched) => onToggleSuccess(item.stockId, nextIsWatched)}
                  />
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="py-14 text-center">
            <p className="typo-body-md text-[color:var(--color-text-secondary)]">아직 추가된 관심 종목이 없습니다.</p>
          </div>
        )}
      </div>

      {items.length > 0 ? (
        <div className="border-t border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-secondary)] p-4">
          <WatchlistPagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} compact />
        </div>
      ) : null}
    </section>
  );
}
