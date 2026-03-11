import type { WatchlistSignal, WatchlistStockItem, WatchlistStreamPayload, WatchlistSummary } from "../types/scraps";

export const WATCHLIST_PAGE_SIZE = 5;

export function formatPriceLabel(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

export function formatSignedRateLabel(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function getRateTextClassName(value: number) {
  if (value > 0) {
    return "text-[color:var(--color-text-danger)]";
  }

  if (value < 0) {
    return "text-[color:var(--color-text-info)]";
  }

  return "text-[color:var(--color-text-tertiary)]";
}

export function normalizeWatchlistSignal(signal: WatchlistSignal) {
  return signal.toUpperCase();
}

export function formatWatchlistSignalLabel(signal: WatchlistSignal) {
  const normalizedSignal = normalizeWatchlistSignal(signal);

  if (normalizedSignal === "BUY" || normalizedSignal === "STRONG_BUY") {
    return "매수";
  }

  if (normalizedSignal === "SELL") {
    return "매도";
  }

  return "관망";
}

export function getWatchlistSignalBadgeClassName(signal: WatchlistSignal) {
  const normalizedSignal = normalizeWatchlistSignal(signal);

  if (normalizedSignal === "BUY" || normalizedSignal === "STRONG_BUY") {
    return "bg-[color:var(--color-bg-danger-subtle)] text-[color:var(--color-text-danger-bold)] outline outline-1 outline-offset-[-1px] outline-[color:rgba(251,44,54,0.16)]";
  }

  if (normalizedSignal === "SELL") {
    return "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)] outline outline-1 outline-offset-[-1px] outline-[color:rgba(43,127,255,0.18)]";
  }

  return "bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-secondary)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]";
}

export function formatWatchlistMetaLabel(item: WatchlistStockItem) {
  return item.sector ? `${item.ticker} · ${item.sector}` : item.ticker;
}

export function formatWatchlistConfidenceLabel(confidence: number) {
  return `신뢰도 ${confidence}%`;
}

export function getWatchlistTotalCount(payload: WatchlistStreamPayload) {
  return payload.watchlist[0]?.total ?? 0;
}

export function getWatchlistTotalPages(payload: WatchlistStreamPayload, pageSize: number) {
  const totalCount = getWatchlistTotalCount(payload);

  if (totalCount === 0) {
    return 0;
  }

  return Math.ceil(totalCount / pageSize);
}

export function formatWatchlistSummary(payload: WatchlistStreamPayload, hiddenItems: WatchlistStockItem[]): WatchlistSummary {
  const hiddenBuyCount = hiddenItems.filter((item) => {
    const signal = normalizeWatchlistSignal(item.signal);
    return signal === "BUY" || signal === "STRONG_BUY";
  }).length;
  const hiddenSellCount = hiddenItems.filter((item) => normalizeWatchlistSignal(item.signal) === "SELL").length;
  const hiddenUpCount = hiddenItems.filter((item) => item.fluctuationRate > 0).length;

  return {
    totalCount: Math.max(0, getWatchlistTotalCount(payload) - hiddenItems.length),
    upCount: Math.max(0, payload.upCount - hiddenUpCount),
    buyCount: Math.max(0, payload.buyCount - hiddenBuyCount),
    sellCount: Math.max(0, payload.sellCount - hiddenSellCount),
  };
}

export function clampPage(page: number, totalPages: number) {
  if (totalPages <= 0) {
    return 1;
  }

  return Math.min(Math.max(1, page), totalPages);
}

export function getPaginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
}

export function formatNewsRelativeTime(publishedAt: string) {
  const publishedDate = new Date(publishedAt);

  if (Number.isNaN(publishedDate.getTime())) {
    return publishedAt;
  }

  const diffMinutes = Math.max(1, Math.floor((Date.now() - publishedDate.getTime()) / 60_000));

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일 전`;
}
