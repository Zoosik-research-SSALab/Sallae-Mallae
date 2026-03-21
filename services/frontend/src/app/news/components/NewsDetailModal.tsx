"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LuX } from "react-icons/lu";
import { useNewsDetailQuery } from "../hooks/useNewsDetailQuery";
import { formatNewsRelativeTime } from "../utils/newsFormatters";

type Props = {
  newsId: number;
  onClose: () => void;
};

function NewsDetailLoadingState() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="h-6 w-48 rounded bg-bg-tertiary" />
      <div className="h-10 w-full rounded bg-bg-tertiary" />
      <div className="h-5 w-40 rounded bg-bg-tertiary" />
      <div className="h-20 w-full rounded bg-bg-tertiary" />
      <div className="h-14 w-full rounded-xl bg-bg-tertiary" />
    </div>
  );
}

export default function NewsDetailModal({ newsId, onClose }: Props) {
  const { data, isLoading, error, refetch, isFetching } = useNewsDetailQuery(newsId);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-90 flex items-center justify-center bg-[#00000066] px-4 py-6 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="inline-flex w-full max-w-xl flex-col items-start overflow-hidden rounded-2xl bg-bg-primary p-6 shadow-[0px_16px_24px_-4px_rgba(0,0,0,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        {isLoading ? (
          <NewsDetailLoadingState />
        ) : error || !data ? (
          <div className="flex w-full flex-col gap-4">
            <div className="flex w-full items-center justify-between">
              <h2 className="text-xl font-extrabold leading-6 text-text-primary">뉴스 상세</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="뉴스 상세 닫기"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-secondary"
              >
                <LuX className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm font-medium leading-5 text-text-secondary">
              {error instanceof Error ? error.message : "뉴스 상세를 불러오지 못했습니다."}
            </p>
            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-[color:var(--color-bg-tertiary)] px-4 py-4 text-base font-semibold leading-6 text-text-secondary"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-bg-inverse-bolder px-4 py-4 text-base font-semibold leading-6 text-[color:var(--color-text-base)] disabled:opacity-60"
              >
                다시 시도
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex w-full flex-col pb-3">
              <div className="flex w-full items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {data.relatedStocks.map((stock) => (
                    <span
                      key={`${data.id}-${stock.id}`}
                      className="inline-flex rounded bg-bg-info-subtle px-2 py-1 text-xs font-semibold leading-4 text-text-info"
                    >
                      {stock.name}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="뉴스 상세 닫기"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-secondary"
                >
                  <LuX className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex w-full flex-col gap-6 pb-6">
              <div className="flex w-full flex-col gap-3">
                <h2 className="text-2xl font-extrabold leading-8 text-text-primary md:text-3xl md:leading-9">
                  {data.title}
                </h2>

                <div className="inline-flex items-center gap-2">
                  <span className="text-sm font-semibold leading-5 text-[color:var(--color-text-secondary)]">
                    {data.publisher}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-[color:var(--color-icon-disabled)]" aria-hidden={true} />
                  <span className="text-xs font-normal leading-4 text-[color:var(--color-text-tertiary)]">
                    {formatNewsRelativeTime(data.publishedAt)}
                  </span>
                </div>

                <p className="whitespace-pre-line text-base font-medium leading-6 text-text-primary">
                  {data.snippet}
                </p>
              </div>
            </div>

            <div className="flex w-full justify-center">
              {data.url ? (
                <a
                  href={data.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-bg-secondary px-4 py-4 text-base font-semibold leading-6 text-[color:var(--color-text-primary)] outline outline-1 outline-offset-[-1px] outline-border-primary transition-colors hover:bg-[color:var(--color-bg-interactive-secondary-hovered)] active:bg-[color:var(--color-bg-interactive-secondary-pressed)]"
                >
                  기사 원문 보기
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--color-bg-secondary)] px-4 py-4 text-base font-semibold leading-6 text-[color:var(--color-text-tertiary)] outline outline-1 -outline-offset-1 outline-[color:var(--color-border-primary)]"
                >
                  기사 원문 없음
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
