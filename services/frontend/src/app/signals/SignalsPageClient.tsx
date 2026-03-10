"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { IoCloseOutline } from "react-icons/io5";
import SignalsDesktopTable from "./components/SignalsDesktopTable";
import SignalsFilterPanel from "./components/SignalsFilterPanel";
import SignalsMobileList from "./components/SignalsMobileList";
import SignalsSortToggle from "./components/SignalsSortToggle";
import { useSignalsInfiniteQuery } from "./hooks/useSignalsInfiniteQuery";
import type { SignalMarketCapFilter, SignalQueryFilter, SignalQuerySort, SignalSectorName } from "./types/signals";

export default function SignalsPageClient() {
  const [signalFilter, setSignalFilter] = useState<SignalQueryFilter>("ALL");
  const [sort, setSort] = useState<SignalQuerySort>("LATEST");
  const [selectedCategories, setSelectedCategories] = useState<SignalSectorName[]>([]);
  const [marketCap, setMarketCap] = useState<SignalMarketCapFilter>("ALL");
  const [keyword, setKeyword] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const deferredKeyword = useDeferredValue(keyword.trim());

  const { items, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading, isFetching, pageSize } = useSignalsInfiniteQuery({
    filter: signalFilter,
    sort,
    categories: selectedCategories,
    marketCap,
    keyword: deferredKeyword,
  });

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isFilterOpen]);

  const toggleCategory = (category: SignalSectorName) => {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    );
  };

  const titleDescription = useMemo(() => "살래말래위원회가 포착한 실시간 최적 타점입니다.", []);

  const handleLoadMore = () => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    void fetchNextPage();
  };

  return (
    <>
      <main className="flex w-full justify-center bg-[color:var(--color-bg-primary)]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-center gap-10 px-6 py-10 lg:flex-row lg:items-start lg:gap-12">
          <aside className="hidden w-72 shrink-0 lg:block">
            <SignalsFilterPanel
              selectedCategories={selectedCategories}
              marketCap={marketCap}
              keyword={keyword}
              onToggleCategory={toggleCategory}
              onResetCategories={() => setSelectedCategories([])}
              onMarketCapChange={setMarketCap}
              onKeywordChange={setKeyword}
            />
          </aside>

          <section className="w-full max-w-[816px]">
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                  <div className="flex flex-col gap-2">
                    <h1 className="typo-heading-2xl text-[color:var(--color-text-primary)] md:typo-heading-3xl">KOSPI 200 매매신호</h1>
                    <p className="typo-body-sm text-[color:var(--color-text-secondary)]">{titleDescription}</p>
                  </div>

                  <div className="hidden lg:block">
                    <SignalsSortToggle value={sort} onChange={setSort} />
                  </div>
                </div>

                <SignalsMobileList
                  items={items}
                  activeFilter={signalFilter}
                  onFilterChange={setSignalFilter}
                  onOpenFilters={() => setIsFilterOpen(true)}
                  onLoadMore={handleLoadMore}
                  hasNextPage={Boolean(hasNextPage)}
                  isLoading={isLoading && !isFetchingNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  pageSize={pageSize}
                />

                <SignalsDesktopTable
                  items={items}
                  activeFilter={signalFilter}
                  onFilterChange={setSignalFilter}
                  onLoadMore={handleLoadMore}
                  hasNextPage={Boolean(hasNextPage)}
                  isLoading={isLoading && !isFetchingNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  pageSize={pageSize}
                />

                {!isLoading && isFetching && !isFetchingNextPage ? (
                  <p className="typo-body-sm text-center text-[color:var(--color-text-tertiary)]">필터를 적용하는 중...</p>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </main>

      {isFilterOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 lg:hidden">
          <button type="button" aria-label="필터 닫기" className="absolute inset-0" onClick={() => setIsFilterOpen(false)} />

          <div className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-[22rem] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center text-[color:var(--color-text-primary)]"
              aria-label="필터 닫기"
            >
              <IoCloseOutline className="h-6 w-6" />
            </button>

            <SignalsFilterPanel
              compact
              selectedCategories={selectedCategories}
              marketCap={marketCap}
              keyword={keyword}
              sort={sort}
              onSortChange={setSort}
              onToggleCategory={toggleCategory}
              onResetCategories={() => setSelectedCategories([])}
              onMarketCapChange={setMarketCap}
              onKeywordChange={setKeyword}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
