"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import WatchlistDesktopTable from "./components/WatchlistDesktopTable";
import WatchlistMobileList from "./components/WatchlistMobileList";
import WatchlistNewsSection from "./components/WatchlistNewsSection";
import WatchlistSummaryStats from "./components/WatchlistSummaryStats";
import { useWatchlistNewsQuery } from "./hooks/useWatchlistNewsQuery";
import { useWatchlistQuery } from "./hooks/useWatchlistQuery";
import { WATCHLIST_PAGE_SIZE, clampPage, formatWatchlistSummary, getWatchlistTotalPages } from "./utils/watchlistDisplay";
import type { WatchlistPayload, WatchlistStockItem } from "./types/scraps";
import Badge from "@/shared/ui/Badge";

function readPageParam(rawPage: string | undefined) {
  const parsedPage = Number(rawPage);

  if (!Number.isFinite(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return Math.floor(parsedPage);
}

const emptyWatchlistPayload: WatchlistPayload = {
  totalCount: 0,
  buyCount: 0,
  sellCount: 0,
  upCount: 0,
  watchlist: [],
};

type Props = {
  initialPage?: string;
};

export default function ScrapsPageClient({ initialPage }: Props) {
  const router = useRouter();
  const currentPage = readPageParam(initialPage);

  const { data: watchlistData = emptyWatchlistPayload, isLoading: isWatchlistLoading, error: watchlistError } = useWatchlistQuery();
  const { data: newsData, isLoading: isNewsLoading, errorMessage: newsErrorMessage } = useWatchlistNewsQuery();

  const [hiddenItems, setHiddenItems] = useState<WatchlistStockItem[]>([]);

  const activeHiddenItems = useMemo(() => {
    const visibleStockIds = new Set(watchlistData.watchlist.map((item) => item.stockId));
    return hiddenItems.filter((item) => visibleStockIds.has(item.stockId));
  }, [hiddenItems, watchlistData.watchlist]);
  const hiddenStockIds = useMemo(() => new Set(activeHiddenItems.map((item) => item.stockId)), [activeHiddenItems]);
  const visibleItems = useMemo(
    () => watchlistData.watchlist.filter((item) => !hiddenStockIds.has(item.stockId)),
    [hiddenStockIds, watchlistData.watchlist],
  );
  const summary = useMemo(() => formatWatchlistSummary(watchlistData, activeHiddenItems), [activeHiddenItems, watchlistData]);
  const totalPages = useMemo(() => getWatchlistTotalPages(summary.totalCount, WATCHLIST_PAGE_SIZE), [summary.totalCount]);
  const safeCurrentPage = clampPage(currentPage, Math.max(totalPages, 1));
  const pagedItems = useMemo(
    () => visibleItems.slice((safeCurrentPage - 1) * WATCHLIST_PAGE_SIZE, safeCurrentPage * WATCHLIST_PAGE_SIZE),
    [safeCurrentPage, visibleItems],
  );
  const hasVisibleWatchlist = isWatchlistLoading || summary.totalCount > 0;
  const shouldShowEmptyState =
    !isWatchlistLoading && !watchlistError && summary.totalCount === 0;

  const replacePage = useCallback(
    (page: number) => {
      if (page <= 1) {
        router.replace("/scraps", { scroll: false });
        return;
      }

      router.replace(`/scraps?page=${page}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      replacePage(safeCurrentPage);
    }
  }, [currentPage, replacePage, safeCurrentPage]);

  const handlePageChange = (page: number) => {
    const nextPage = clampPage(page, Math.max(totalPages, 1));

    if (nextPage === safeCurrentPage) {
      return;
    }

    replacePage(nextPage);
  };

  const handleToggleSuccess = (stockId: number, nextIsWatched: boolean) => {
    const targetItem = watchlistData.watchlist.find((item) => item.stockId === stockId);

    setHiddenItems((current) => {
      if (nextIsWatched) {
        return current.filter((item) => item.stockId !== stockId);
      }

      if (!targetItem || current.some((item) => item.stockId === stockId)) {
        return current;
      }

      return [...current, targetItem];
    });
  };

  return (
    <main className="flex w-full justify-center bg-[color:var(--color-bg-primary)]">
      <div className="mx-auto flex w-full max-w-[1440px] justify-center px-4 pb-14 pt-8 md:px-6 md:pb-16 md:pt-10 lg:px-8 xl:px-0">
        <div className="flex w-full max-w-[1024px] flex-col gap-10">
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-extrabold leading-9 text-[color:var(--color-text-primary)] md:text-4xl md:leading-[48px]">
                나의 관심 종목
              </h1>
              <p className="hidden text-base font-medium leading-6 text-[color:var(--color-text-secondary)] lg:block">
                관심 종목의 현재가와 AI 매매신호를 한눈에 비교해보세요.
              </p>
              <p className="text-sm font-medium leading-5 text-[color:var(--color-text-secondary)] opacity-80 lg:hidden">
                관심 종목의 실시간 변화와 AI 매매 신호를 확인하세요.
              </p>
            </div>
          </section>

          <WatchlistSummaryStats summary={summary} />

          {watchlistError ? <Badge tone="danger">관심 종목을 불러오지 못했습니다.</Badge> : null}
          {newsErrorMessage ? <Badge tone="danger">{newsErrorMessage}</Badge> : null}

          <section className="flex flex-col gap-6 pt-2">
            <div className="flex justify-end lg:hidden">
              <Link
                href="/stocks"
                className="typo-body-sm inline-flex rounded-lg border border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)] px-4 py-2 font-semibold text-[color:var(--color-text-secondary)] shadow-[0px_1px_2px_rgba(0,0,0,0.12)] transition-colors hover:bg-[color:var(--color-bg-secondary)] hover:text-[color:var(--color-text-primary)]"
              >
                + 관심 종목 더 찾아보기
              </Link>
            </div>

            {hasVisibleWatchlist ? (
              <>
                <WatchlistMobileList
                  items={pagedItems}
                  pageSize={WATCHLIST_PAGE_SIZE}
                  isLoading={isWatchlistLoading}
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  onToggleSuccess={handleToggleSuccess}
                />

                <WatchlistDesktopTable
                  items={pagedItems}
                  pageSize={WATCHLIST_PAGE_SIZE}
                  isLoading={isWatchlistLoading}
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  onToggleSuccess={handleToggleSuccess}
                />
              </>
            ) : null}

            {shouldShowEmptyState ? (
              <div className="rounded-2xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-secondary)] px-6 py-10 text-center">
                <p className="typo-body-md text-[color:var(--color-text-secondary)]">
                  관심 종목을 추가하면 이곳에서 실시간으로 확인할 수 있습니다.
                </p>
              </div>
            ) : null}

            <div className="hidden justify-end pt-2 md:pt-4 lg:flex">
              <Link
                href="/stocks"
                className="typo-body-md inline-flex rounded-lg border border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)] px-6 py-3 font-semibold text-[color:var(--color-text-secondary)] shadow-[0px_1px_2px_rgba(0,0,0,0.12)] transition-colors hover:bg-[color:var(--color-bg-secondary)] hover:text-[color:var(--color-text-primary)]"
              >
                + 관심 종목 더 찾아보기
              </Link>
            </div>
          </section>

          <WatchlistNewsSection items={newsData?.news ?? []} isLoading={isNewsLoading} />
        </div>
      </div>
    </main>
  );
}
