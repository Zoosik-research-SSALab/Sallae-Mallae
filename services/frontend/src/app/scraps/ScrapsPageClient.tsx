"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WatchlistDesktopTable from "./components/WatchlistDesktopTable";
import WatchlistMobileList from "./components/WatchlistMobileList";
import WatchlistNewsSection from "./components/WatchlistNewsSection";
import WatchlistSummaryStats from "./components/WatchlistSummaryStats";
import { useWatchlistNewsQuery } from "./hooks/useWatchlistNewsQuery";
import { useWatchlistStream } from "./hooks/useWatchlistStream";
import { WATCHLIST_PAGE_SIZE, clampPage, formatWatchlistSummary, getWatchlistTotalPages } from "./utils/watchlistDisplay";
import type { WatchlistStockItem } from "./types/scraps";
import Badge from "@/shared/ui/Badge";

function readPageParam(rawPage: string | undefined) {
  const parsedPage = Number(rawPage);

  if (!Number.isFinite(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return Math.floor(parsedPage);
}

type Props = {
  initialPage?: string;
};

export default function ScrapsPageClient({ initialPage }: Props) {
  const router = useRouter();
  const currentPage = readPageParam(initialPage);

  const { data: streamData, isLoading: isStreamLoading, error: streamError } = useWatchlistStream(currentPage, WATCHLIST_PAGE_SIZE);
  const { data: newsData, isLoading: isNewsLoading, errorMessage: newsErrorMessage } = useWatchlistNewsQuery();

  const [hiddenItems, setHiddenItems] = useState<WatchlistStockItem[]>([]);
  const hideTimeoutIdsRef = useRef<number[]>([]);

  useEffect(() => {
    const timeoutIds = hideTimeoutIdsRef.current;

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const hiddenStockIds = useMemo(() => new Set(hiddenItems.map((item) => item.stockId)), [hiddenItems]);
  const displayedItems = useMemo(
    () => streamData.watchlist.filter((item) => !hiddenStockIds.has(item.stockId)),
    [hiddenStockIds, streamData.watchlist],
  );
  const totalPages = useMemo(() => getWatchlistTotalPages(streamData, WATCHLIST_PAGE_SIZE), [streamData]);
  const summary = useMemo(() => formatWatchlistSummary(streamData, hiddenItems), [hiddenItems, streamData]);

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
    if (totalPages > 0 && currentPage > totalPages) {
      replacePage(clampPage(currentPage, totalPages));
    }
  }, [currentPage, replacePage, totalPages]);

  const handlePageChange = (page: number) => {
    const nextPage = clampPage(page, Math.max(totalPages, 1));

    if (nextPage === currentPage) {
      return;
    }

    replacePage(nextPage);
  };

  const handleToggleSuccess = (stockId: number, nextIsWatched: boolean) => {
    const targetItem = streamData.watchlist.find((item) => item.stockId === stockId);

    setHiddenItems((current) => {
      if (nextIsWatched) {
        return current.filter((item) => item.stockId !== stockId);
      }

      if (!targetItem || current.some((item) => item.stockId === stockId)) {
        return current;
      }

      return [...current, targetItem];
    });

    if (!nextIsWatched && targetItem) {
      const timeoutId = window.setTimeout(() => {
        setHiddenItems((current) => current.filter((item) => item.stockId !== stockId));
      }, 6000);

      hideTimeoutIdsRef.current.push(timeoutId);
    }
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
                관심 종목들의 현재가와 AI 매매신호를 한눈에 비교해보세요.
              </p>
              <p className="text-sm font-medium leading-5 text-[color:var(--color-text-secondary)] opacity-80 lg:hidden">
                관심 종목들의 실시간 변화와 AI 매매 의견을 확인하세요.
              </p>
            </div>
          </section>

          <WatchlistSummaryStats summary={summary} />

          {streamError ? <Badge tone="danger">관심 종목 스트림 연결에 실패했습니다.</Badge> : null}
          {newsErrorMessage ? <Badge tone="danger">{newsErrorMessage}</Badge> : null}

          <section className="flex flex-col gap-6 pt-2">
            <WatchlistMobileList
              items={displayedItems}
              pageSize={WATCHLIST_PAGE_SIZE}
              isLoading={isStreamLoading}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onToggleSuccess={handleToggleSuccess}
            />

            <WatchlistDesktopTable
              items={displayedItems}
              pageSize={WATCHLIST_PAGE_SIZE}
              isLoading={isStreamLoading}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onToggleSuccess={handleToggleSuccess}
            />

            {!isStreamLoading && summary.totalCount === 0 ? (
              <div className="rounded-2xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-secondary)] px-6 py-10 text-center">
                <p className="typo-body-md text-[color:var(--color-text-secondary)]">관심 종목을 추가하면 이곳에서 실시간으로 확인할 수 있습니다.</p>
              </div>
            ) : null}

            <div className="flex justify-end pt-2 md:pt-4">
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
