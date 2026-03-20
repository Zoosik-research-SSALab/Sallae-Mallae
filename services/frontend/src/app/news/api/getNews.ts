import { apiFetch } from "@/shared/lib/apiClient";
import type { NewsItem, NewsPayload, NewsQueryParams, NewsTrendingKeyword, NewsTrendingPayload } from "../types/news";

type NewsApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: {
    code?: string;
    message?: string;
  } | null;
};

function createNewsSearchParams(params: NewsQueryParams) {
  const searchParams = new URLSearchParams({
    offset: String(params.offset),
    limit: String(params.limit),
  });

  if (params.keyword) {
    searchParams.set("keyword", params.keyword);
  }

  return searchParams.toString();
}

function normalizeNewsItem(candidate: unknown): NewsItem {
  if (!candidate || typeof candidate !== "object") {
    return {
      id: 0,
      title: "",
      publisher: "",
      publishedAt: null,
      relatedStocks: [],
      url: null,
    };
  }

  const item = candidate as Record<string, unknown>;
  const publishedAt = typeof item.publishedAt === "string"
    ? item.publishedAt
    : typeof item.published_at === "string"
      ? item.published_at
      : null;
  const relatedStocks = Array.isArray(item.relatedStocks)
    ? item.relatedStocks
    : Array.isArray(item.related_stocks)
      ? item.related_stocks
      : [];

  return {
    id: typeof item.id === "number" ? item.id : 0,
    title: typeof item.title === "string" ? item.title : "",
    publisher: typeof item.publisher === "string" ? item.publisher : "",
    publishedAt,
    relatedStocks: relatedStocks.filter((value): value is string => typeof value === "string"),
    url: typeof item.url === "string" ? item.url : null,
  };
}

function normalizeTrendingKeyword(candidate: unknown, fallbackRank: number): NewsTrendingKeyword {
  if (!candidate || typeof candidate !== "object") {
    return {
      rank: fallbackRank,
      keyword: "",
    };
  }

  const item = candidate as Record<string, unknown>;

  return {
    rank: typeof item.rank === "number" ? item.rank : fallbackRank,
    keyword: typeof item.keyword === "string" ? item.keyword : "",
  };
}

function isNewsApiEnvelope<T>(payload: unknown): payload is NewsApiEnvelope<T> {
  return typeof payload === "object" && payload !== null && "success" in payload && "data" in payload;
}

function unwrapNewsApiResponse<T>(payload: T | NewsApiEnvelope<T>, fallbackMessage: string) {
  if (isNewsApiEnvelope<T>(payload)) {
    if (payload.data !== null) {
      return payload.data;
    }

    throw new Error(payload.error?.message ?? fallbackMessage);
  }

  return payload;
}

export async function getNews(params: NewsQueryParams) {
  const payload = await apiFetch<NewsPayload | NewsApiEnvelope<NewsPayload>>(`/api/news?${createNewsSearchParams(params)}`, {
    cache: "no-store",
  });
  const unwrapped = unwrapNewsApiResponse(payload, "뉴스 응답이 올바르지 않습니다.");

  return {
    news: Array.isArray(unwrapped.news) ? unwrapped.news.map((item) => normalizeNewsItem(item)) : [],
  } satisfies NewsPayload;
}

export async function getTrendingNews() {
  const payload = await apiFetch<NewsTrendingPayload | NewsApiEnvelope<NewsTrendingPayload>>("/api/news/trending", {
    cache: "no-store",
  });
  const unwrapped = unwrapNewsApiResponse(payload, "뉴스 키워드 응답이 올바르지 않습니다.");

  return {
    trending: Array.isArray(unwrapped.trending)
      ? unwrapped.trending
          .map((item, index) => normalizeTrendingKeyword(item, index + 1))
          .filter((item) => item.keyword)
      : [],
  } satisfies NewsTrendingPayload;
}
