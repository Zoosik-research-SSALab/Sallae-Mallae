"use client";

import { memo, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { GoArrowUpRight, GoChevronRight, GoSearch, GoX } from "react-icons/go";
import { formatStockSectorLabel } from "@/app/stocks/utils/stockSectorLabels";
import type {
  RecentSearchItem,
  SearchAutocompleteResponse,
  SearchNewsItem,
  SearchStockItem,
  TrendingSearchStockItem,
} from "@/shared/types/search";
import Input from "@/shared/ui/Input";
import { cn } from "@/shared/utils/cn";

type Props = {
  open: boolean;
  value: string;
  recentSearches?: RecentSearchItem[];
  searchResults?: SearchAutocompleteResponse;
  isSearching?: boolean;
  trendingStocks?: TrendingSearchStockItem[];
  trendingStocksUpdatedAt?: string | null;
  isTrendingStocksLoading?: boolean;
  placeholder?: string;
  className?: string;
  onClose: () => void;
  onValueChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  onRecentSearchClick?: (item: RecentSearchItem) => void;
  onRecentSearchRemove?: (keyword: string) => void;
  onRecentSearchesClear?: () => void;
  onStockSelect?: (stock: SearchStockItem) => void;
  onNewsSelect?: (news: SearchNewsItem) => void;
  onTrendingStockSelect?: (stock: TrendingSearchStockItem) => void;
};

type SearchResultTab = "all" | "stocks" | "news";

const TAB_ITEMS: Array<{ value: SearchResultTab; label: string }> = [
  { value: "all", label: "전체" },
  { value: "stocks", label: "종목" },
  { value: "news", label: "뉴스" },
];

const EMPTY_STOCK_RESULTS: SearchStockItem[] = [];
const EMPTY_NEWS_RESULTS: SearchNewsItem[] = [];
const EMPTY_RECENT_SEARCHES: RecentSearchItem[] = [];
const EMPTY_TRENDING_STOCKS: TrendingSearchStockItem[] = [];
const RESULT_ROW_VISIBILITY_CLASS = "[content-visibility:auto] [contain-intrinsic-size:88px] [contain:layout_paint]";
const COMPACT_NEWS_ROW_VISIBILITY_CLASS = "[content-visibility:auto] [contain-intrinsic-size:92px] [contain:layout_paint]";
const RECENT_ROW_VISIBILITY_CLASS = "[content-visibility:auto] [contain-intrinsic-size:60px] [contain:layout_paint]";
const TRENDING_ROW_VISIBILITY_CLASS = "[content-visibility:auto] [contain-intrinsic-size:56px] [contain:layout_paint]";

function formatPrice(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function formatSignedRate(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  if (value > 0) {
    return `+${value.toFixed(2)}%`;
  }

  if (value < 0) {
    return `${value.toFixed(2)}%`;
  }

  return "0.00%";
}

function formatSearchedAt(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function formatTrendingUpdatedAt(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `오늘 ${new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date)} 기준`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getHighlightedSegments(text: string, keyword: string) {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) {
    return [{ value: text, isMatch: false }];
  }

  const pattern = new RegExp(`(${escapeRegExp(trimmedKeyword)})`, "gi");
  const segments = text.split(pattern);

  if (segments.length === 1) {
    return [{ value: text, isMatch: false }];
  }

  return segments.map((segment) => ({
    value: segment,
    isMatch: segment.toLowerCase() === trimmedKeyword.toLowerCase(),
  }));
}

const HighlightedText = memo(function HighlightedText({
  text,
  keyword,
}: {
  text: string;
  keyword: string;
}) {
  const segments = useMemo(() => getHighlightedSegments(text, keyword), [keyword, text]);

  return (
    <>
      {segments.map((segment, index) => (
        <span
          key={`${segment.value}-${index}`}
          className={segment.isMatch ? "text-[color:var(--color-text-interactive-primary)]" : undefined}
        >
          {segment.value}
        </span>
      ))}
    </>
  );
});

const StockResultRow = memo(function StockResultRow({
  stock,
  keyword,
  onClick,
}: {
  stock: SearchStockItem;
  keyword: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-2xl p-2 text-left transition-colors hover:bg-[color:var(--color-bg-secondary)]",
        RESULT_ROW_VISIBILITY_CLASS,
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="typo-body-xs flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-bg-interactive-primary)] font-semibold text-[color:var(--color-text-base)]">
          로고
        </div>
        <div className="min-w-0">
          <div className="typo-body-md truncate font-extrabold text-[color:var(--color-text-primary)]">
            <HighlightedText text={stock.name} keyword={keyword} />
          </div>
          <div className="typo-body-sm mt-0.5 truncate font-medium text-[color:var(--color-text-secondary)]">
            {stock.ticker} <span className="typo-body-xs mx-1">|</span> {formatStockSectorLabel(stock.gicsSector)}
          </div>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="typo-body-md font-semibold text-[color:var(--color-text-primary)]">
          {formatPrice(stock.currentPrice)}
        </div>
        <div
          className={cn(
            "typo-body-sm mt-0.5 font-semibold",
            typeof stock.fluctuationRate === "number" && stock.fluctuationRate > 0
              ? "text-[color:var(--color-text-danger)]"
              : typeof stock.fluctuationRate === "number" && stock.fluctuationRate < 0
                ? "text-[color:var(--color-text-info)]"
                : "text-[color:var(--color-text-secondary)]",
          )}
        >
          {formatSignedRate(stock.fluctuationRate)}
        </div>
      </div>
    </button>
  );
});

const NewsResultRow = memo(function NewsResultRow({
  news,
  keyword,
  onClick,
  compact = false,
}: {
  news: SearchNewsItem;
  keyword: string;
  onClick?: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center justify-between gap-4 rounded-3xl bg-[color:var(--color-bg-secondary)] px-5 py-4 text-left transition-colors hover:bg-[color:var(--color-bg-tertiary)]",
          COMPACT_NEWS_ROW_VISIBILITY_CLASS,
        )}
      >
        <div className="min-w-0">
          <div className="typo-body-md line-clamp-2 font-bold text-[color:var(--color-text-primary)]">
            <HighlightedText text={news.title} keyword={keyword} />
          </div>
          <div className="typo-body-sm mt-1 text-[color:var(--color-text-secondary)]">
            {news.publisher} · {formatSearchedAt(news.publishedAt)}
          </div>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[color:var(--color-text-secondary)]">
          <GoArrowUpRight className="h-4 w-4" />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-start gap-1 rounded-2xl p-4 text-left transition-colors hover:bg-[color:var(--color-bg-secondary)]",
        RESULT_ROW_VISIBILITY_CLASS,
      )}
    >
      <div className="typo-body-md line-clamp-2 font-semibold text-[color:var(--color-text-primary)]">
        <HighlightedText text={news.title} keyword={keyword} />
      </div>
      <div className="typo-body-sm text-[color:var(--color-text-secondary)]">
        {news.publisher} · {formatSearchedAt(news.publishedAt)}
      </div>
    </button>
  );
});

const RecentSearchRow = memo(function RecentSearchRow({
  item,
  onClick,
  onRemove,
}: {
  item: RecentSearchItem;
  onClick?: (item: RecentSearchItem) => void;
  onRemove?: (keyword: string) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl p-3 transition-colors hover:bg-[color:var(--color-bg-secondary)]",
        RECENT_ROW_VISIBILITY_CLASS,
      )}
    >
      <button
        type="button"
        onClick={() => onClick?.(item)}
        className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
      >
        <span className="typo-body-sm truncate font-medium text-[color:var(--color-text-primary)]">
          {item.keyword}
        </span>
        <span className="typo-body-xs shrink-0 text-[color:var(--color-text-tertiary)]">
          {formatSearchedAt(item.searchedAt)}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onRemove?.(item.keyword)}
        aria-label={`${item.keyword} 최근 검색어 제거`}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[color:var(--color-border-disabled)] transition-colors hover:bg-[color:var(--color-bg-secondary)] hover:text-[color:var(--color-text-primary)]"
      >
        <GoX className="h-3.5 w-3.5" />
      </button>
    </div>
  );
});

const TrendingStockRow = memo(function TrendingStockRow({
  stock,
  onClick,
}: {
  stock: TrendingSearchStockItem;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[color:var(--color-bg-secondary)]",
        TRENDING_ROW_VISIBILITY_CLASS,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="typo-body-md w-4 shrink-0 font-extrabold text-[color:var(--color-text-info)]">
          {stock.rank}
        </span>
        <div className="typo-body-xs flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-bg-interactive-primary)] font-semibold text-[color:var(--color-text-base)]">
          로고
        </div>
        <span className="typo-body-md truncate font-semibold text-[color:var(--color-text-primary)]">
          {stock.name}
        </span>
      </div>

      <span
        className={cn(
          "typo-body-md shrink-0 font-semibold",
          typeof stock.fluctuationRate === "number" && stock.fluctuationRate > 0
            ? "text-[color:var(--color-text-danger)]"
            : typeof stock.fluctuationRate === "number" && stock.fluctuationRate < 0
              ? "text-[color:var(--color-text-info)]"
              : "text-[color:var(--color-text-secondary)]",
        )}
      >
        {formatSignedRate(stock.fluctuationRate)}
      </span>
    </button>
  );
});

export default function SearchModal({
  open,
  value,
  recentSearches = [],
  searchResults = { stocks: [], news: [] },
  isSearching = false,
  trendingStocks = [],
  trendingStocksUpdatedAt = null,
  isTrendingStocksLoading = false,
  placeholder = "종목명 또는 코드 검색",
  className,
  onClose,
  onValueChange,
  onSubmit,
  onRecentSearchClick,
  onRecentSearchRemove,
  onRecentSearchesClear,
  onStockSelect,
  onNewsSelect,
  onTrendingStockSelect,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const trimmedValue = value.trim();
  const deferredKeyword = useDeferredValue(trimmedValue);
  const normalizedRecentSearches = Array.isArray(recentSearches) ? recentSearches : EMPTY_RECENT_SEARCHES;
  const normalizedStockResults = Array.isArray(searchResults?.stocks) ? searchResults.stocks : EMPTY_STOCK_RESULTS;
  const normalizedNewsResults = Array.isArray(searchResults?.news) ? searchResults.news : EMPTY_NEWS_RESULTS;
  const normalizedTrendingStocks = Array.isArray(trendingStocks) ? trendingStocks : EMPTY_TRENDING_STOCKS;
  const isShowingResults = Boolean(trimmedValue);
  const hasRecentSearches = normalizedRecentSearches.length > 0;
  const hasStockResults = normalizedStockResults.length > 0;
  const hasNewsResults = normalizedNewsResults.length > 0;
  const hasTrendingStocks = normalizedTrendingStocks.length > 0;
  const hasAnyResults = hasStockResults || hasNewsResults;
  const stockPreview = normalizedStockResults.slice(0, 5);
  const newsPreview = normalizedNewsResults.slice(0, 3);
  const trendingPreview = normalizedTrendingStocks.slice(0, 5);
  const showStockMore = normalizedStockResults.length > stockPreview.length;
  const showNewsMore = normalizedNewsResults.length > newsPreview.length;

  const initialTab: SearchResultTab = !isShowingResults
    ? "all"
    : hasStockResults && !hasNewsResults
      ? "stocks"
      : "all";

  const [currentTab, setCurrentTab] = useState<SearchResultTab>(initialTab);

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const previousActiveElement = document.activeElement as HTMLElement | null;

    document.body.style.overflow = "hidden";

    const dialogElement = dialogRef.current;

    const getFocusableElements = () => {
      if (!dialogElement) {
        return [];
      }

      return Array.from(
        dialogElement.querySelectorAll<HTMLElement>(
          [
            "button:not([disabled])",
            "input:not([disabled])",
            "select:not([disabled])",
            "textarea:not([disabled])",
            "a[href]",
            '[tabindex]:not([tabindex="-1"])',
          ].join(","),
        ),
      ).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
    };

    getFocusableElements()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const focusedElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (focusedElement === firstElement || !dialogElement?.contains(focusedElement)) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (focusedElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousActiveElement?.focus();
    };
  }, [onClose, open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextValue = value.trim();
    if (!nextValue) {
      return;
    }

    onSubmit?.(nextValue);
  };

  const handleTabChange = (tab: SearchResultTab) => {
    setCurrentTab(tab);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!open) {
    return null;
  }

  const visibleTab: SearchResultTab = !isShowingResults
    ? "all"
    : currentTab === "stocks" && hasStockResults
      ? "stocks"
      : currentTab === "news" && hasNewsResults
        ? "news"
        : hasStockResults && !hasNewsResults
          ? "stocks"
          : hasNewsResults && !hasStockResults
            ? "news"
            : "all";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 sm:px-6">
      <button
        type="button"
        aria-label="검색 모달 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/48 backdrop-blur-[2px]"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-[1] flex h-[720px] max-h-[calc(100vh-48px)] w-full max-w-[672px] flex-col overflow-hidden rounded-xl bg-[color:var(--color-bg-primary)] shadow-[0px_16px_24px_-4px_rgba(0,0,0,0.16)]",
          className,
        )}
      >
        <h1 id={titleId} className="sr-only">
          검색
        </h1>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 border-b border-[color:var(--color-border-primary)] p-4"
        >
          <div className="relative flex-1">
            <GoSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-text-tertiary)]" />
            <Input
              autoFocus
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="h-10 rounded-xl border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-secondary)] py-2 pl-9 pr-3 text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-text-tertiary)] focus-visible:border-[color:var(--color-border-interactive-primary)] focus-visible:ring-[color:var(--color-bg-interactive-primary)]/15"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="검색 모달 닫기"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-bg-secondary)] hover:text-[color:var(--color-text-primary)]"
          >
            <GoX className="h-5 w-5" />
          </button>
        </form>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain bg-[color:var(--color-bg-primary)] [contain:layout_paint]"
        >
          <div className="flex flex-col gap-4 p-4">
            {isShowingResults ? (
              <>
                <section className="flex flex-col gap-4">
                  <div className="border-b border-[color:var(--color-border-primary)] pt-2">
                    <div className="relative flex items-start gap-6">
                      {TAB_ITEMS.map((tab) => (
                        <button
                          key={tab.value}
                          type="button"
                          onClick={() => handleTabChange(tab.value)}
                          className={cn(
                            "typo-body-md relative pb-3 font-semibold transition-colors",
                            visibleTab === tab.value
                              ? "text-[color:var(--color-text-primary)]"
                              : "text-[color:var(--color-text-tertiary)]",
                          )}
                        >
                          {tab.label}
                          {visibleTab === tab.value ? (
                            <motion.span
                              layoutId="search-modal-tab-underline"
                              transition={{ type: "spring", stiffness: 520, damping: 42 }}
                              className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[color:var(--color-border-base)]"
                            />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isSearching ? (
                    <p className="typo-body-sm text-[color:var(--color-text-tertiary)]">검색 중입니다.</p>
                  ) : null}
                </section>

                {!isSearching && visibleTab === "all" ? (
                  hasAnyResults ? (
                    <div className="flex flex-col gap-10">
                      {hasStockResults ? (
                        <section className="flex flex-col gap-4">
                          <div className="flex items-center justify-between gap-4">
                            <h2 className="typo-body-md font-semibold text-[color:var(--color-text-secondary)]">종목</h2>
                            {showStockMore ? (
                              <button
                                type="button"
                                onClick={() => handleTabChange("stocks")}
                                className="typo-body-sm inline-flex items-center gap-1 font-semibold text-[color:var(--color-text-secondary)] transition-colors hover:text-[color:var(--color-text-primary)]"
                              >
                                종목 더보기
                                <GoChevronRight className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>

                          <div className="flex flex-col gap-2 px-1">
                            {stockPreview.map((stock) => (
                              <StockResultRow
                                key={stock.id}
                                stock={stock}
                                keyword={deferredKeyword}
                                onClick={() => onStockSelect?.(stock)}
                              />
                            ))}
                          </div>
                        </section>
                      ) : null}

                      {hasNewsResults ? (
                        <section className="flex flex-col gap-4">
                          <div className="flex items-center justify-between gap-4">
                            <h2 className="typo-body-md font-semibold text-[color:var(--color-text-secondary)]">뉴스</h2>
                            {showNewsMore ? (
                              <button
                                type="button"
                                onClick={() => handleTabChange("news")}
                                className="typo-body-sm inline-flex items-center gap-1 font-semibold text-[color:var(--color-text-secondary)] transition-colors hover:text-[color:var(--color-text-primary)]"
                              >
                                뉴스 더보기
                                <GoChevronRight className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>

                          <div className="flex flex-col gap-3">
                            {newsPreview.map((news) => (
                              <NewsResultRow
                                key={news.id}
                                news={news}
                                keyword={deferredKeyword}
                                onClick={() => onNewsSelect?.(news)}
                                compact
                              />
                            ))}
                          </div>
                        </section>
                      ) : null}
                    </div>
                  ) : (
                    <p className="typo-body-sm text-[color:var(--color-text-tertiary)]">
                      일치하는 검색 결과가 없습니다.
                    </p>
                  )
                ) : null}

                {!isSearching && visibleTab === "stocks" ? (
                  hasStockResults ? (
                    <section className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        {normalizedStockResults.map((stock) => (
                          <StockResultRow
                            key={stock.id}
                            stock={stock}
                            keyword={deferredKeyword}
                            onClick={() => onStockSelect?.(stock)}
                          />
                        ))}
                      </div>
                    </section>
                  ) : (
                    <p className="typo-body-sm text-[color:var(--color-text-tertiary)]">
                      일치하는 종목이 없습니다.
                    </p>
                  )
                ) : null}

                {!isSearching && visibleTab === "news" ? (
                  hasNewsResults ? (
                    <section className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        {normalizedNewsResults.map((news) => (
                          <NewsResultRow
                            key={news.id}
                            news={news}
                            keyword={deferredKeyword}
                            onClick={() => onNewsSelect?.(news)}
                          />
                        ))}
                      </div>
                    </section>
                  ) : (
                    <p className="typo-body-sm text-[color:var(--color-text-tertiary)]">
                      일치하는 뉴스가 없습니다.
                    </p>
                  )
                ) : null}
              </>
            ) : (
              <div className="flex flex-col gap-8">
                <section className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="typo-body-md font-semibold text-[color:var(--color-text-secondary)]">최근 검색어</h2>
                    {hasRecentSearches ? (
                      <button
                        type="button"
                        onClick={onRecentSearchesClear}
                        className="typo-body-sm font-medium text-[color:var(--color-text-tertiary)] transition-colors hover:text-[color:var(--color-text-primary)]"
                      >
                        검색 기록 전체 삭제
                      </button>
                    ) : null}
                  </div>

                  {hasRecentSearches ? (
                    <div className="flex flex-col gap-2">
                      {normalizedRecentSearches.map((item) => (
                        <RecentSearchRow
                          key={`${item.keyword}-${item.searchedAt}`}
                          item={item}
                          onClick={onRecentSearchClick}
                          onRemove={onRecentSearchRemove}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="typo-body-sm text-[color:var(--color-text-tertiary)]">
                      최근 검색어가 없습니다.
                    </p>
                  )}
                </section>

                <section className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="typo-body-md font-semibold text-[color:var(--color-text-secondary)]">인기 검색</h2>
                    {trendingStocksUpdatedAt ? (
                      <span className="typo-body-sm text-[color:var(--color-text-tertiary)]">
                        {formatTrendingUpdatedAt(trendingStocksUpdatedAt)}
                      </span>
                    ) : null}
                  </div>

                  {hasTrendingStocks ? (
                    <div className="flex flex-col gap-1">
                      {trendingPreview.map((stock) => (
                        <TrendingStockRow
                          key={`${stock.stockId}-${stock.rank}`}
                          stock={stock}
                          onClick={() => onTrendingStockSelect?.(stock)}
                        />
                      ))}
                    </div>
                  ) : isTrendingStocksLoading ? (
                    <p className="typo-body-sm text-[color:var(--color-text-tertiary)]">
                      인기 검색을 불러오는 중입니다.
                    </p>
                  ) : (
                    <p className="typo-body-sm text-[color:var(--color-text-tertiary)]">
                      인기 검색이 없습니다.
                    </p>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
