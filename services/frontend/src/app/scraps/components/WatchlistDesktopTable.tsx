import Link from "next/link";
import ValueChangeRateText from "@/shared/components/ValueChangeRateText";
import WatchlistHeartButton from "@/shared/components/WatchlistHeartButton";
import type { WatchlistStockItem } from "../types/scraps";
import {
  formatPriceLabel,
  formatSignedRateLabel,
  formatWatchlistConfidenceLabel,
  formatWatchlistMetaLabel,
  getRateTextClassName,
} from "../utils/watchlistDisplay";
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

function DesktopSkeletonRow({ index }: { index: number }) {
  return (
    <div key={`watchlist-desktop-skeleton-${index}`} className="border-b border-[color:var(--color-border-secondary)] px-4 py-4">
      <div className="h-16 rounded-2xl bg-[color:var(--color-bg-secondary)]" />
    </div>
  );
}

export default function WatchlistDesktopTable({
  items,
  pageSize,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  onToggleSuccess,
}: Props) {
  return (
    <section className="hidden w-full flex-col gap-0 lg:flex">
      <div className="border-b border-[color:var(--color-border-base)] px-4 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex flex-1 items-center gap-6 px-1">
            <span className="typo-body-sm font-semibold text-[color:var(--color-text-primary)]">종목명</span>
          </div>

          <div className="flex flex-1 items-center justify-between gap-4">
            <span className="typo-body-sm w-28 text-right font-semibold text-[color:var(--color-text-primary)]">현재가 / 등락률</span>
            <span className="typo-body-sm w-28 text-center font-semibold text-[color:var(--color-text-primary)]">AI 매매신호</span>
            <span className="typo-body-sm w-16 text-right font-semibold text-[color:var(--color-text-primary)]">관심 추가</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        {isLoading ? (
          Array.from({ length: pageSize }).map((_, index) => <DesktopSkeletonRow key={index} index={index} />)
        ) : items.length > 0 ? (
          items.map((item) => (
            <article key={item.stockId} className="border-b border-[color:var(--color-border-secondary)] px-4 py-4">
              <div className="flex items-center justify-between gap-6">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <StockAvatar name={item.name} />
                  <div className="min-w-0">
                    <Link
                      href={`/stocks/${item.ticker}`}
                      className="typo-body-md truncate font-semibold text-[color:var(--color-text-primary)] transition-colors hover:text-[color:var(--color-text-interactive-primary)]"
                    >
                      {item.name}
                    </Link>
                    <div className="typo-body-xs mt-1 truncate font-semibold text-[color:var(--color-text-tertiary)]">
                      {formatWatchlistMetaLabel(item)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 items-center justify-between gap-4">
                  <div className="flex w-28 flex-col items-end">
                    <div className="typo-body-md text-right font-extrabold text-[color:var(--color-text-primary)]">
                      {formatPriceLabel(item.price)}
                    </div>
                    <ValueChangeRateText
                      value={item.fluctuationRate}
                      padding="x-none"
                      className={`typo-body-sm justify-end font-semibold ${getRateTextClassName(item.fluctuationRate)}`}
                    >
                      {formatSignedRateLabel(item.fluctuationRate)}
                    </ValueChangeRateText>
                  </div>

                  <div className="flex w-28 flex-col items-center gap-1">
                    <WatchlistSignalBadge signal={item.signal} />
                    <span className="typo-body-xs font-semibold text-[color:var(--color-text-tertiary)]">
                      {formatWatchlistConfidenceLabel(item.confidence)}
                    </span>
                  </div>

                  <div className="flex w-16 justify-end">
                    <WatchlistHeartButton
                      stockId={item.stockId}
                      stockName={item.name}
                      initialWatched
                      inactiveIconStyle="outline"
                      onToggleSuccess={(nextIsWatched) => onToggleSuccess(item.stockId, nextIsWatched)}
                    />
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="px-4 py-16 text-center">
            <p className="typo-body-md text-[color:var(--color-text-secondary)]">아직 추가된 관심 종목이 없습니다.</p>
          </div>
        )}
      </div>

      {items.length > 0 ? (
        <div className="border-t border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-secondary)] p-4">
          <WatchlistPagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      ) : null}
    </section>
  );
}
