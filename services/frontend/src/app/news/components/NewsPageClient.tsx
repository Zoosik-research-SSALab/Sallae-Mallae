"use client";

import { useDeferredValue, useState } from "react";
import { LuSearch, LuSlidersHorizontal } from "react-icons/lu";
import NewsArticleCard from "./NewsArticleCard";
import NewsFilterModal from "./NewsFilterModal";
import NewsKeywordSidebar from "./NewsKeywordSidebar";
import { useNewsQuery } from "../hooks/useNewsQuery";
import type { NewsPeriodOption, NewsSortOption, NewsTab } from "../types/news";
import { buildRankedNewsKeywords, filterNewsByPeriod, filterNewsByTab, sortNewsItems } from "../utils/newsFormatters";
import { NEWS_FETCH_LIMIT, NEWS_PAGE_SIZE } from "../utils/newsConstants";
import Button from "@/shared/ui/Button";
import Pagination from "@/shared/ui/Pagination";

const tabs: Array<{ value: NewsTab; label: string }> = [
  { value: "LATEST", label: "최신뉴스" },
  { value: "WATCHLIST", label: "관심주식" },
];

function NewsLoadingState() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl bg-[color:var(--color-bg-secondary)] px-4 py-6 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]"
        >
          <div className="mb-4 flex gap-2">
            <div className="h-6 w-20 rounded bg-[color:var(--color-bg-tertiary)]" />
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
  const [sortOption, setSortOption] = useState<NewsSortOption>("LATEST");
  const [periodOption, setPeriodOption] = useState<NewsPeriodOption>("MONTH");
  const [draftSortOption, setDraftSortOption] = useState<NewsSortOption>("LATEST");
  const [draftPeriodOption, setDraftPeriodOption] = useState<NewsPeriodOption>("MONTH");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useNewsQuery({
    offset: 0,
    // TODO: switch to server-side pagination once the production news API supports filtered paging.
    limit: NEWS_FETCH_LIMIT,
    keyword: deferredKeyword,
  });

  const queriedNews = data?.news ?? [];
  const tabFilteredNews = filterNewsByTab(queriedNews, activeTab);
  const periodFilteredNews = filterNewsByPeriod(tabFilteredNews, periodOption);
  const sortedNews = sortNewsItems(periodFilteredNews, sortOption, deferredKeyword);
  const totalPages = Math.max(1, Math.ceil(sortedNews.length / NEWS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedNews = sortedNews.slice((safeCurrentPage - 1) * NEWS_PAGE_SIZE, safeCurrentPage * NEWS_PAGE_SIZE);
  const rankedKeywords = buildRankedNewsKeywords(queriedNews);

  const openFilterModal = () => {
    setDraftSortOption(sortOption);
    setDraftPeriodOption(periodOption);
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setSortOption(draftSortOption);
    setPeriodOption(draftPeriodOption);
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
                    언급된 종목과 시장의 흐름을 빠르게 파악하세요
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
                      draftSort={draftSortOption}
                      draftPeriod={draftPeriodOption}
                      onSortChange={setDraftSortOption}
                      onPeriodChange={setDraftPeriodOption}
                      onApply={applyFilters}
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

              {isLoading ? <NewsLoadingState /> : null}

              {!isLoading && error ? (
                <div className="rounded-3xl bg-[color:var(--color-bg-secondary)] p-6 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]">
                  <h2 className="text-xl font-extrabold leading-6 text-[color:var(--color-text-primary)]">
                    뉴스를 불러오지 못했습니다.
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-5 text-[color:var(--color-text-secondary)]">
                    {error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요."}
                  </p>
                  <Button variant="soft" onClick={() => void refetch()} disabled={isFetching} className="mt-4 rounded-xl">
                    다시 시도
                  </Button>
                </div>
              ) : null}

              {!isLoading && !error ? (
                <>
                  <div className="flex flex-col">
                    {pagedNews.length > 0 ? (
                      pagedNews.map((item) => <NewsArticleCard key={item.id} item={item} />)
                    ) : (
                      <div className="rounded-2xl bg-[color:var(--color-bg-secondary)] px-4 py-10 text-center">
                        <p className="text-base font-semibold leading-6 text-[color:var(--color-text-secondary)]">
                          조건에 맞는 뉴스가 없습니다.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="py-3 md:py-12">
                    <Pagination currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
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
    </main>
  );
}
