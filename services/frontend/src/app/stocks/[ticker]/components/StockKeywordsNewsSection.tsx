"use client";

import { useMemo, useState } from "react";
import type { StockKeyword } from "@/app/stocks/types/stockDetail";
import { formatRelativePublishedAt } from "../utils/stockDetailFormatters";
import StockSectionLoadingOverlay from "./common/StockSectionLoadingOverlay";

type Props = {
  keywords: StockKeyword[];
  isLoading: boolean;
  onNewsSelect?: (newsId: number) => void;
};

export default function StockKeywordsNewsSection({ keywords, isLoading, onNewsSelect }: Props) {
  const [selectedKeywordKey, setSelectedKeywordKey] = useState<string | null>(null);

  const visibleKeywords = useMemo(() => keywords.slice(0, 3), [keywords]);
  const activeKeywordKey = useMemo(() => {
    const matchedKeyword = visibleKeywords.find((keyword, index) => {
      const keywordKey = String(keyword.id ?? `${keyword.name}-${index}`);
      return keywordKey === selectedKeywordKey;
    });

    if (matchedKeyword) {
      return String(
        matchedKeyword.id ??
          `${matchedKeyword.name}-${visibleKeywords.indexOf(matchedKeyword)}`,
      );
    }

    if (visibleKeywords[0]) {
      return String(visibleKeywords[0].id ?? `${visibleKeywords[0].name}-0`);
    }

    return null;
  }, [selectedKeywordKey, visibleKeywords]);
  const activeKeyword =
    visibleKeywords.find((keyword, index) => {
      const keywordKey = String(keyword.id ?? `${keyword.name}-${index}`);
      return keywordKey === activeKeywordKey;
    }) ??
    visibleKeywords[0] ??
    null;
  const activeKeywordNews = activeKeyword?.news ?? [];

  return (
    <section className="border-b border-[color:var(--color-border-primary)] pb-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="typo-body-lg text-[color:var(--color-text-primary)]">종목 키워드</h2>
          <span className="text-xs font-medium leading-4 text-[color:var(--color-text-tertiary)] md:text-sm md:leading-5">
            관련 뉴스
          </span>
        </div>

        <StockSectionLoadingOverlay active={isLoading}>
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-2.5">
              {isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-8 w-24 animate-pulse rounded-lg bg-[color:var(--color-bg-secondary)]"
                    />
                  ))
                : visibleKeywords.map((keyword, index) => {
                    const keywordKey = String(keyword.id ?? `${keyword.name}-${index}`);
                    const isActive = keywordKey === activeKeywordKey;

                    return (
                      <button
                        key={keywordKey}
                        type="button"
                        onClick={() => setSelectedKeywordKey(keywordKey)}
                        className={
                          isActive
                            ? "inline-flex min-w-0 items-center justify-center rounded-lg bg-[color:var(--color-bg-info-subtle)] px-2 py-1.5 text-[color:var(--color-text-info)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-interactive-primary)]"
                            : "inline-flex min-w-0 items-center justify-center rounded-lg bg-[color:var(--color-bg-secondary)] px-2 py-1.5 text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-bg-info-subtle)] hover:text-[color:var(--color-text-info)]"
                        }
                      >
                        <span className="typo-news-tag block w-full truncate whitespace-nowrap text-center">
                          #{keyword.name}
                        </span>
                      </button>
                    );
                  })}
            </div>

            <div className="flex flex-col gap-5">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <div className="h-6 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                    <div className="h-4 w-40 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                  </div>
                ))
              ) : activeKeywordNews.length > 0 ? (
                activeKeywordNews.map((item, index) => {
                  const content = (
                    <>
                      <div className="typo-body-md font-semibold text-[color:var(--color-text-primary)]">
                        {item.title}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold leading-4 text-[color:var(--color-text-secondary)] md:text-xs">
                        <span>{item.publisher ?? "출처 미상"}</span>
                        <span>{formatRelativePublishedAt(item.publishedAt)}</span>
                      </div>
                    </>
                  );

                  const newsKey = String(item.id ?? `${activeKeyword.name}-news-${index}`);

                  if (typeof item.id === "number" && onNewsSelect) {
                    return (
                      <button
                        key={newsKey}
                        type="button"
                        onClick={() => onNewsSelect(item.id as number)}
                        className="block w-full text-left transition-colors hover:text-[color:var(--color-text-interactive-primary)]"
                      >
                        {content}
                      </button>
                    );
                  }

                  return <div key={newsKey}>{content}</div>;
                })
              ) : (
                <div className="rounded-2xl bg-[color:var(--color-bg-secondary)] px-4 py-5 text-sm font-medium text-[color:var(--color-text-secondary)]">
                  {activeKeyword ? `${activeKeyword.name} 관련 뉴스가 없습니다.` : "관련 뉴스가 없습니다."}
                </div>
              )}
            </div>
          </div>
        </StockSectionLoadingOverlay>
      </div>
    </section>
  );
}
