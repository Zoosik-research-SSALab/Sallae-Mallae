import { authApiFetch } from "@/shared/lib/authApiClient";
import type { WatchlistNewsItem, WatchlistNewsPayload } from "../types/scraps";

type WatchlistNewsEnvelope = {
  success: boolean;
  data: WatchlistNewsPayload | null;
  error: {
    code?: string;
    message?: string;
  } | null;
};

function isWatchlistNewsEnvelope(payload: unknown): payload is WatchlistNewsEnvelope {
  return typeof payload === "object" && payload !== null && "success" in payload && "data" in payload;
}

function normalizeWatchlistNewsItem(candidate: unknown): WatchlistNewsItem {
  if (!candidate || typeof candidate !== "object") {
    return {
      id: 0,
      title: "",
      summary: "",
      source: "",
      url: undefined,
      publishedAt: null,
      relatedStocks: [],
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
    summary:
      typeof item.summary === "string"
        ? item.summary
        : typeof item.snippet === "string"
          ? item.snippet
          : "",
    source:
      typeof item.source === "string"
        ? item.source
        : typeof item.publisher === "string"
          ? item.publisher
          : "",
    url: typeof item.url === "string" ? item.url : undefined,
    publishedAt,
    relatedStocks: relatedStocks.filter((value): value is string => typeof value === "string"),
  };
}

type WatchlistNewsQueryParams = {
  offset?: number;
  limit?: number;
};

function createWatchlistNewsSearchParams(params?: WatchlistNewsQueryParams) {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();

  if (typeof params.offset === "number") {
    searchParams.set("offset", String(params.offset));
  }

  if (typeof params.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }

  const search = searchParams.toString();
  return search ? `?${search}` : "";
}

export async function getWatchlistNews(params?: WatchlistNewsQueryParams) {
  const payload = await authApiFetch<WatchlistNewsPayload | WatchlistNewsEnvelope>(`/api/users/watchlist/news${createWatchlistNewsSearchParams(params)}`, {
    cache: "no-store",
    useBaseUrl: false,
  });

  const newsPayload = isWatchlistNewsEnvelope(payload)
    ? payload.data
    : payload;

  if (!newsPayload) {
    throw new Error(
      isWatchlistNewsEnvelope(payload)
        ? payload.error?.message ?? "관심 종목 뉴스를 불러오지 못했습니다."
        : "관심 종목 뉴스를 불러오지 못했습니다.",
    );
  }

  return {
    news: Array.isArray(newsPayload.news)
      ? newsPayload.news.map((item) => normalizeWatchlistNewsItem(item))
      : [],
  } satisfies WatchlistNewsPayload;
}
