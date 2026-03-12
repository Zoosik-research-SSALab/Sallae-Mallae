"use client";

import { useMemo, useState } from "react";
import type { StockKeyword } from "@/app/stocks/types/stockDetail";
import { formatRelativePublishedAt } from "../utils/stockDetailFormatters";

type Props = {
  keywords: StockKeyword[];
  isLoading: boolean;
};

export default function StockKeywordsNewsSection({ keywords, isLoading }: Props) {
  const [selectedKeywordId, setSelectedKeywordId] = useState<number | null>(null);
  const activeKeywordId = keywords.some((keyword) => keyword.id === selectedKeywordId)
    ? selectedKeywordId
    : keywords[0]?.id ?? null;

  const selectedKeyword = useMemo(
    () => keywords.find((keyword) => keyword.id === activeKeywordId) ?? keywords[0],
    [activeKeywordId, keywords],
  );

  return (
    <section className="border-b border-[color:var(--color-border-primary)] pb-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="typo-body-lg text-[color:var(--color-text-primary)]">종목 핵심 뉴스</h2>
          <span className="text-xs font-medium leading-4 text-[color:var(--color-text-tertiary)] md:text-sm md:leading-5">더보기</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-8 w-24 animate-pulse rounded-lg bg-[color:var(--color-bg-secondary)]" />
              ))
            : keywords.slice(0, 3).map((keyword) => {
                const isActive = selectedKeyword?.id === keyword.id;

                return (
                  <button
                    key={keyword.id}
                    type="button"
                    onClick={() => setSelectedKeywordId(keyword.id)}
                    className={`inline-flex min-w-0 items-center justify-center rounded-lg px-2 py-1.5 transition-colors ${
                      isActive
                        ? "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)]"
                        : "bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-bg-secondary)]"
                    }`}
                  >
                    <span className="typo-news-tag block w-full truncate whitespace-nowrap text-center">#{keyword.name}</span>
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
          ) : selectedKeyword && selectedKeyword.news.length > 0 ? (
            selectedKeyword.news.map((item) => {
              const content = (
                <>
                  <div className="typo-body-md font-semibold text-[color:var(--color-text-primary)]">{item.title}</div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold leading-4 text-[color:var(--color-text-secondary)] md:text-xs">
                    <span>{item.publisher}</span>
                    <span>{formatRelativePublishedAt(item.publishedAt)}</span>
                  </div>
                </>
              );

              return item.url ? (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block transition-colors hover:text-[color:var(--color-text-interactive-primary)]"
                >
                  {content}
                </a>
              ) : (
                <div key={item.id}>
                  {content}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl bg-[color:var(--color-bg-secondary)] px-4 py-5 text-sm font-medium text-[color:var(--color-text-secondary)]">
              관련 뉴스가 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
