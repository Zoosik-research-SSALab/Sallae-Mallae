import type { NewsItem, NewsTab, NewsTrendingKeyword } from "../types/news";
import { WATCHLIST_NEWS_STOCKS } from "./mockNewsData";
import { parseNewsDateInputValue } from "./newsDateUtils";
import { normalizeNewsKeyword } from "./newsQueryUtils";

const watchlistStockSet = new Set(WATCHLIST_NEWS_STOCKS);

function getKoreanTimeDiff(value: number, unit: Intl.RelativeTimeFormatUnit) {
  return new Intl.RelativeTimeFormat("ko", { numeric: "auto" }).format(value, unit);
}

function getPublishedTimestamp(value: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getRelevanceScore(item: NewsItem, keyword: string) {
  const normalizedKeyword = normalizeNewsKeyword(keyword);
  if (!normalizedKeyword) {
    return 0;
  }

  const title = item.title.toLowerCase();
  const publisher = item.publisher.toLowerCase();
  const stocks = item.relatedStocks.join(" ").toLowerCase();

  let score = 0;
  if (title.includes(normalizedKeyword)) {
    score += 3;
  }
  if (stocks.includes(normalizedKeyword)) {
    score += 2;
  }
  if (publisher.includes(normalizedKeyword)) {
    score += 1;
  }

  return score;
}

export function filterNewsByKeyword(items: NewsItem[], keyword: string) {
  const normalizedKeyword = normalizeNewsKeyword(keyword);

  if (!normalizedKeyword) {
    return items;
  }

  return items.filter((item) => getRelevanceScore(item, normalizedKeyword) > 0);
}

export function formatNewsRelativeTime(publishedAt: string | null) {
  const publishedTimestamp = getPublishedTimestamp(publishedAt);

  if (publishedTimestamp === 0) {
    return "-";
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - publishedTimestamp) / 60_000));

  if (diffMinutes < 1) {
    return "방금 전";
  }

  if (diffMinutes < 60) {
    return getKoreanTimeDiff(-diffMinutes, "minute");
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return getKoreanTimeDiff(-diffHours, "hour");
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return getKoreanTimeDiff(-diffDays, "day");
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `${diffWeeks}주 전`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  return `${Math.max(1, diffMonths)}개월 전`;
}

export function filterNewsByTab(items: NewsItem[], tab: NewsTab) {
  if (tab === "LATEST") {
    return items;
  }

  return items.filter((item) => item.relatedStocks.some((stock) => watchlistStockSet.has(stock)));
}

export function filterNewsByDateRange(items: NewsItem[], startDate: string | null, endDate: string | null) {
  const parsedStartDate = parseNewsDateInputValue(startDate);
  const parsedEndDate = parseNewsDateInputValue(endDate);

  if (!parsedStartDate && !parsedEndDate) {
    return items;
  }

  const startThreshold = parsedStartDate
    ? new Date(parsedStartDate.getFullYear(), parsedStartDate.getMonth(), parsedStartDate.getDate(), 0, 0, 0, 0).getTime()
    : Number.NEGATIVE_INFINITY;
  const endThreshold = parsedEndDate
    ? new Date(parsedEndDate.getFullYear(), parsedEndDate.getMonth(), parsedEndDate.getDate(), 23, 59, 59, 999).getTime()
    : Number.POSITIVE_INFINITY;

  return items.filter((item) => {
    const publishedTimestamp = getPublishedTimestamp(item.publishedAt);
    return publishedTimestamp === 0 || (publishedTimestamp >= startThreshold && publishedTimestamp <= endThreshold);
  });
}

export function buildRankedNewsKeywords(items: NewsItem[]): NewsTrendingKeyword[] {
  const keywordCountMap = new Map<string, number>();

  items.forEach((item) => {
    item.relatedStocks.forEach((stock) => {
      keywordCountMap.set(stock, (keywordCountMap.get(stock) ?? 0) + 1);
    });
  });

  return [...keywordCountMap.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ko"))
    .slice(0, 6)
    .map(([keyword], index) => ({
      rank: index + 1,
      keyword,
    }));
}
