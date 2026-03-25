"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { LuSearch, LuSlidersHorizontal } from "react-icons/lu";
import Button from "@/shared/ui/Button";
import Pagination from "@/shared/ui/Pagination";
import NewsArticleCard from "./NewsArticleCard";
import NewsDetailModal from "./NewsDetailModal";
import NewsFilterModal from "./NewsFilterModal";
import NewsKeywordSidebar from "./NewsKeywordSidebar";
import { useNewsQuery } from "../hooks/useNewsQuery";
import { useNewsTrendingQuery } from "../hooks/useNewsTrendingQuery";
import { useNewsWatchlistQuery } from "../hooks/useNewsWatchlistQuery";
import type { NewsDateRange, NewsTab } from "../types/news";
import { NEWS_PAGE_SIZE } from "../utils/newsConstants";
import { createEmptyNewsDateRange, createTodayNewsDateRange } from "../utils/newsDateUtils";
import { buildRankedNewsKeywords } from "../utils/newsFormatters";

const NEWS_PAGES_PER_BATCH = 4;
const NEWS_BATCH_LIMIT = NEWS_PAGE_SIZE * NEWS_PAGES_PER_BATCH;

const tabs: Array<{ value: NewsTab; label: string }> = [
  { value: "LATEST", label: "최신 뉴스" },
  { value: "WATCHLIST", label: "관심 주식" },
];

function NewsLoadingState() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl bg-bg-secondary px-4 py-6 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]"
        >
          <div className="mb-4 flex gap-2">
            <div className="h-6 w-20 rounded bg-bg-tertiary" />
            <div className="h-6 w-24 rounded bg-[color:var(--color-bg-tertiary)]" />
          </div>
          <div className="h-6 w-full rounded bg-[color:var(--color-bg-tertiary)]" />
          <div className="mt-2 h-6 w-4/5 rounded bg-[color:var(--color-bg-tertiary)]" />
          <div className="mt-4 h-4 w-36 rounded bg-[color:var(--color-bg-tertiary)]" />
        </div>
      ))}
    </div>
  );
}

export default function NewsPageClient() {
  const [searchInput, setSearchInput] = useState("");
  const deferredKeyword = useDeferredValue(searchInput.trim());
  const [activeTab, setActiveTab] = useState<NewsTab>("LATEST");
  const [dateRange, setDateRange] = useState<NewsDateRange>(createEmptyNewsDateRange());
  const [draftDateRange, setDraftDateRange] = useState<NewsDateRange>(createEmptyNewsDateRange());
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedNewsId, setSelectedNewsId] = useState<number | null>(null);
  const batchStartPage = Math.floor((currentPage - 1) / NEWS_PAGES_PER_BATCH) * NEWS_PAGES_PER_BATCH + 1;
  const offset = (batchStartPage - 1) * NEWS_PAGE_SIZE;

  const latestNewsQuery = useNewsQuery({
    offset,
    limit: NEWS_BATCH_LIMIT,
    keyword: deferredKeyword,
    startDate: dateRange.startDate ?? undefined,
    endDate: dateRange.endDate ?? undefined,
  }, {
    enabled: activeTab === "LATEST",
  });
  const watchlistNewsQuery = useNewsWatchlistQuery(
    {
      offset,
      limit: NEWS_BATCH_LIMIT,
      keyword: deferredKeyword,
      startDate: dateRange.startDate ?? undefined,
      endDate: dateRange.endDate ?? undefined,
    },
    {
      enabled: activeTab === "WATCHLIST",
    },
  );
  const trendingKeywordsQuery = useNewsTrendingQuery();

  const activeNewsQuery = activeTab === "WATCHLIST" ? watchlistNewsQuery : latestNewsQuery;
  const rankedKeywords = trendingKeywordsQuery.data?.trending ?? buildRankedNewsKeywords(latestNewsQuery.data?.news ?? []);
  const totalCount = activeNewsQuery.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / NEWS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageOffsetInBatch = Math.max(0, safeCurrentPage - batchStartPage);
  const pagedItems = useMemo(
    () => {
      const currentItems = activeNewsQuery.data?.news ?? [];
      return currentItems.slice(
        pageOffsetInBatch * NEWS_PAGE_SIZE,
        (pageOffsetInBatch + 1) * NEWS_PAGE_SIZE,
      );
    },
    [activeNewsQuery.data, pageOffsetInBatch],
  );

  const openFilterModal = () => {
    setDraftDateRange(dateRange.startDate || dateRange.endDate ? dateRange : createTodayNewsDateRange());
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setDateRange(draftDateRange);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const applyKeywordSearch = (nextKeyword: string) => {
    setSearchInput(nextKeyword.trim());
    setActiveTab("LATEST");
    setCurrentPage(1);
  };

  return (
    <main className="flex w-full justify-center bg-[color:var(--color-bg-primary)] py-6 md:py-10 lg:py-12">
      <div className="w-full max-w-[1152px] px-4 md:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,704px)_320px] lg:items-start lg:gap-16">
          <section className="min-w-0">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <div>
                  <h1 className="text-3xl font-extrabold leading-9 text-[color:var(--color-text-primary)] md:text-4xl md:leading-[48px]">
                    주식 뉴스
                  </h1>
                </div>
                <div>
                  <p className="text-sm font-medium leading-5 text-[color:var(--color-text-secondary)] md:text-base md:leading-6">
                    궁금한 종목과 시장의 흐름을 빠르게 파악하세요.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
                <div className="flex h-12 min-w-0 flex-1 items-center gap-4 rounded-lg bg-[color:var(--color-bg-secondary)] px-4 py-2.5 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]">
                  <LuSearch className="h-4 w-4 shrink-0 text-[color:var(--color-text-tertiary)]" />
                  <input
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="뉴스 키워드 또는 종목명 검색"
                    className="h-full w-full border-0 bg-transparent px-0 py-0 text-sm text-[color:var(--color-text-primary)] outline-none placeholder:text-[color:var(--color-text-tertiary)] md:text-base"
                  />
                </div>

                <div className="relative">
                  <Button
                    variant="soft"
                    onClick={openFilterModal}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border-[color:var(--color-border-secondary)] bg-transparent px-4 py-3 text-sm font-bold leading-5 text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-bg-secondary)] md:w-auto"
                  >
                    <LuSlidersHorizontal className="h-4 w-4" />
                    상세 필터
                  </Button>

                  {isFilterOpen ? (
                    <NewsFilterModal
                      draftRange={draftDateRange}
                      onRangeChange={setDraftDateRange}
                      onApply={applyFilters}
                      onReset={() => setDraftDateRange(createEmptyNewsDateRange())}
                      onClose={() => setIsFilterOpen(false)}
                    />
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-6 overflow-x-auto border-b border-[color:var(--color-border-primary)]">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.value);
                      setCurrentPage(1);
                    }}
                    className={`border-b px-1 pb-2 text-sm font-semibold leading-5 transition-colors md:text-base md:leading-6 ${
                      activeTab === tab.value
                        ? "border-[color:var(--color-border-base)] text-[color:var(--color-text-primary)]"
                        : "border-transparent text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-secondary)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeNewsQuery.isLoading ? <NewsLoadingState /> : null}

              {!activeNewsQuery.isLoading && activeNewsQuery.error ? (
                <div className="rounded-3xl bg-[color:var(--color-bg-secondary)] p-6 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]">
                  <h2 className="text-xl font-extrabold leading-6 text-[color:var(--color-text-primary)]">
                    뉴스를 불러오지 못했습니다.
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-5 text-[color:var(--color-text-secondary)]">
                    {activeNewsQuery.error instanceof Error ? activeNewsQuery.error.message : "잠시 후 다시 시도해 주세요."}
                  </p>
                  <Button variant="soft" onClick={() => void activeNewsQuery.refetch()} disabled={activeNewsQuery.isFetching} className="mt-4 rounded-xl">
                    다시 시도
                  </Button>
                </div>
              ) : null}

              {!activeNewsQuery.isLoading && !activeNewsQuery.error ? (
                <>
                  <div className="flex flex-col">
                    {pagedItems.length > 0 ? (
                      pagedItems.map((item) => (
                        <NewsArticleCard
                          key={item.id}
                          item={item}
                          onSelect={setSelectedNewsId}
                        />
                      ))
                    ) : (
                      <div className="rounded-2xl bg-[color:var(--color-bg-secondary)] px-4 py-10 text-center">
                        <p className="text-base font-semibold leading-6 text-[color:var(--color-text-secondary)]">
                          조건에 맞는 뉴스가 없습니다.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="py-3 md:py-12">
                    <Pagination
                      currentPage={safeCurrentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      maxVisiblePages={4}
                      windowMode="forward"
                    />
                  </div>
                </>
              ) : null}
            </div>
          </section>

          <aside className="hidden lg:block">
            <NewsKeywordSidebar items={rankedKeywords} onKeywordSelect={applyKeywordSearch} />
          </aside>
        </div>
      </div>

      {selectedNewsId !== null ? (
        <NewsDetailModal
          newsId={selectedNewsId}
          onClose={() => setSelectedNewsId(null)}
        />
      ) : null}
    </main>
  );
}
