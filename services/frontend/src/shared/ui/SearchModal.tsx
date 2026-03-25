"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GoSearch, GoX } from "react-icons/go";
import type { RecentSearchItem, SearchAutocompleteResponse, SearchNewsItem, SearchStockItem } from "@/shared/types/search";
import Input from "@/shared/ui/Input";
import { cn } from "@/shared/utils/cn";

type Props = {
  open: boolean;
  value: string;
  recentSearches?: RecentSearchItem[];
  searchResults?: SearchAutocompleteResponse;
  isSearching?: boolean;
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
};

type SearchResultTab = "stocks" | "news";

function formatPrice(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function formatSignedRate(value: number) {
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
  }).format(date);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(text: string, keyword: string) {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) {
    return text;
  }

  const pattern = new RegExp(`(${escapeRegExp(trimmedKeyword)})`, "gi");
  const segments = text.split(pattern);

  if (segments.length === 1) {
    return text;
  }

  return segments.map((segment, index) => {
    const isMatch = segment.toLowerCase() === trimmedKeyword.toLowerCase();

    return (
      <span
        key={`${segment}-${index}`}
        className={isMatch ? "text-[color:var(--color-text-interactive-primary)]" : undefined}
      >
        {segment}
      </span>
    );
  });
}

export default function SearchModal({
  open,
  value,
  recentSearches = [],
  searchResults = { stocks: [], news: [] },
  isSearching = false,
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
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<SearchResultTab>("stocks");
  const trimmedValue = value.trim();
  const normalizedRecentSearches = Array.isArray(recentSearches) ? recentSearches : [];
  const normalizedStockResults = Array.isArray(searchResults?.stocks) ? searchResults.stocks : [];
  const normalizedNewsResults = Array.isArray(searchResults?.news) ? searchResults.news : [];
  const isShowingResults = Boolean(trimmedValue);
  const hasRecentSearches = normalizedRecentSearches.length > 0;
  const hasStockResults = normalizedStockResults.length > 0;
  const hasNewsResults = normalizedNewsResults.length > 0;
  const visibleTab =
    isShowingResults && activeTab === "stocks" && !hasStockResults && hasNewsResults
      ? "news"
      : isShowingResults && activeTab === "news" && !hasNewsResults && hasStockResults
        ? "stocks"
        : activeTab;

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const previousActiveElement = document.activeElement as HTMLElement | null;

    document.body.style.overflow = 'hidden';

    const dialogElement = dialogRef.current;

    const getFocusableElements = () => {
      if (!dialogElement) return [];

      return Array.from(
        dialogElement.querySelectorAll<HTMLElement>(
          [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])',
          ].join(","),
        ),
      ).filter((element) => {
        return !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true";
      });
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
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (activeElement === firstElement || !dialogElement?.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }

    };
    window.addEventListener("keydown", onKeyDown);

    return() => {
      document.body.style.overflow = originalOverflow;

      window.removeEventListener("keydown", onKeyDown);

      previousActiveElement?.focus();
    };

    
  }, [onClose, open]);
  

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextValue = value.trim();
    if (!nextValue) return;

    onSubmit?.(nextValue);
  };

  if (!open) {
    return null;
  }

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

        <div className="flex-1 overflow-y-auto bg-[color:var(--color-bg-primary)]">
          <div className="flex flex-col gap-8 p-6">
            {isShowingResults ? (
              <>
                <section className="flex flex-col gap-4">
                  <div className="border-b border-[color:var(--color-border-primary)] pt-2">
                    <div className="flex items-start gap-6">
                      <button
                        type="button"
                        onClick={() => setActiveTab("stocks")}
                        className={cn(
                          "typo-body-md border-b pb-3 font-semibold transition-colors",
                          visibleTab === "stocks"
                            ? "border-[color:var(--color-border-base)] text-[color:var(--color-text-primary)]"
                            : "border-transparent text-[color:var(--color-text-tertiary)]",
                        )}
                      >
                        종목
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("news")}
                        className={cn(
                          "typo-body-md border-b pb-3 font-semibold transition-colors",
                          visibleTab === "news"
                            ? "border-[color:var(--color-border-base)] text-[color:var(--color-text-primary)]"
                            : "border-transparent text-[color:var(--color-text-tertiary)]",
                        )}
                      >
                        이슈·뉴스
                      </button>
                    </div>
                  </div>

                  {isSearching ? <p className="typo-body-sm text-[color:var(--color-text-tertiary)]">검색 중...</p> : null}
                </section>

                {!isSearching && visibleTab === "stocks" ? (
                  <section className="flex flex-col gap-4">
                    {hasStockResults ? (
                      <div className="flex flex-col gap-2 px-2">
                        {normalizedStockResults.map((stock) => (
                          <button
                            key={stock.id}
                            type="button"
                            onClick={() => onStockSelect?.(stock)}
                            className="flex w-full items-center justify-between gap-4 rounded-2xl p-4 text-left transition-colors hover:bg-[color:var(--color-bg-secondary)]"
                          >
                            <div className="flex min-w-0 items-center gap-4">
                              <div className="typo-body-xs flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-bg-interactive-primary)] font-semibold text-[color:var(--color-text-base)]">
                                로고
                              </div>
                              <div className="min-w-0">
                                <div className="typo-body-md truncate font-extrabold text-[color:var(--color-text-primary)]">
                                  {renderHighlightedText(stock.name, trimmedValue)}
                                </div>
                                <div className="typo-body-sm mt-0.5 truncate font-medium text-[color:var(--color-text-secondary)]">
                                  {stock.ticker} <span className="typo-body-xs mx-1">|</span> {stock.gicsSector}
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="typo-body-md font-semibold text-[color:var(--color-text-primary)]">{formatPrice(stock.currentPrice)}</div>
                              <div className={cn("typo-body-sm mt-0.5 font-semibold", stock.fluctuationRate > 0 ? "text-[color:var(--color-text-danger)]" : stock.fluctuationRate < 0 ? "text-[color:var(--color-text-info)]" : "text-[color:var(--color-text-secondary)]")}>
                                {formatSignedRate(stock.fluctuationRate)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="typo-body-sm text-[color:var(--color-text-tertiary)]">일치하는 종목이 없습니다.</p>
                    )}
                  </section>
                ) : null}

                {!isSearching && visibleTab === "news" ? (
                  <section className="flex flex-col gap-4">
                    {hasNewsResults ? (
                      <div className="flex flex-col gap-2 px-2">
                        {normalizedNewsResults.map((news) => (
                          <button
                            key={news.id}
                            type="button"
                            onClick={() => onNewsSelect?.(news)}
                            className="flex w-full flex-col items-start gap-1 rounded-2xl p-4 text-left transition-colors hover:bg-[color:var(--color-bg-secondary)]"
                          >
                            <div className="typo-body-md line-clamp-2 font-semibold text-[color:var(--color-text-primary)]">
                              {renderHighlightedText(news.title, trimmedValue)}
                            </div>
                            <div className="typo-body-sm text-[color:var(--color-text-secondary)]">
                              {news.publisher} · {formatSearchedAt(news.publishedAt)}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="typo-body-sm text-[color:var(--color-text-tertiary)]">일치하는 이슈·뉴스가 없습니다.</p>
                    )}
                  </section>
                ) : null}
              </>
            ) : (
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
                      <div
                        key={`${item.keyword}-${item.searchedAt}`}
                        className="flex items-center justify-between gap-3 rounded-xl p-3 transition-colors hover:bg-[color:var(--color-bg-secondary)]"
                      >
                        <button
                          type="button"
                          onClick={() => onRecentSearchClick?.(item)}
                          className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                        >
                          <span className="typo-body-sm truncate font-medium text-[color:var(--color-text-primary)]">{item.keyword}</span>
                          <span className="typo-body-xs shrink-0 text-[color:var(--color-text-tertiary)]">{formatSearchedAt(item.searchedAt)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRecentSearchRemove?.(item.keyword)}
                          aria-label={`${item.keyword} 최근 검색어 삭제`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[color:var(--color-border-disabled)] transition-colors hover:bg-[color:var(--color-bg-secondary)] hover:text-[color:var(--color-text-primary)]"
                        >
                          <GoX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="typo-body-sm text-[color:var(--color-text-tertiary)]">최근 검색어가 없습니다.</p>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
