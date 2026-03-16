import type { NewsItem, NewsPeriodOption, NewsSortOption, NewsTab, RankedNewsKeyword } from "../types/news";
import { getMockNewsSeeds, WATCHLIST_NEWS_STOCKS } from "./mockNewsData";

const watchlistStockSet = new Set(WATCHLIST_NEWS_STOCKS);

function getKoreanTimeDiff(value: number, unit: Intl.RelativeTimeFormatUnit) {
  return new Intl.RelativeTimeFormat("ko", { numeric: "auto" }).format(value, unit);
}

function normalizeKeyword(value: string) {
  return value.trim().toLowerCase();
}

function getPopularityScore(item: NewsItem) {
  const seed = getMockNewsSeeds().find((candidate) => candidate.id === item.id);
  return seed?.views ?? item.id * 97;
}

function getRelevanceScore(item: NewsItem, keyword: string) {
  const normalizedKeyword = normalizeKeyword(keyword);
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

export function formatNewsRelativeTime(publishedAt: string) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(publishedAt).getTime()) / 60_000));

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

export function filterNewsByPeriod(items: NewsItem[], period: NewsPeriodOption) {
  const periodDays = period === "WEEK" ? 7 : period === "MONTH" ? 30 : 90;
  const threshold = Date.now() - periodDays * 24 * 60 * 60 * 1000;

  return items.filter((item) => new Date(item.publishedAt).getTime() >= threshold);
}

export function sortNewsItems(items: NewsItem[], sort: NewsSortOption, keyword: string) {
  return [...items].sort((left, right) => {
    if (sort === "POPULAR") {
      return getPopularityScore(right) - getPopularityScore(left);
    }

    if (sort === "RELEVANCE") {
      const relevanceDiff = getRelevanceScore(right, keyword) - getRelevanceScore(left, keyword);
      if (relevanceDiff !== 0) {
        return relevanceDiff;
      }
    }

    return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
  });
}

export function buildRankedNewsKeywords(items: NewsItem[]): RankedNewsKeyword[] {
  const keywordCountMap = new Map<string, number>();

  items.forEach((item) => {
    item.relatedStocks.forEach((stock) => {
      keywordCountMap.set(stock, (keywordCountMap.get(stock) ?? 0) + 1);
    });
  });

  return [...keywordCountMap.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((left, right) => right.count - left.count || left.keyword.localeCompare(right.keyword, "ko"))
    .slice(0, 6);
}
