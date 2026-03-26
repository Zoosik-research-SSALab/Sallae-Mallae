import { apiFetch } from "@/shared/lib/apiClient";
import type { StockKeyword, StockKeywordNewsItem, StockKeywordsPayload } from "@/app/stocks/types/stockDetail";
import type { StockDetailApiEnvelope } from "./stockDetailApi";
import { unwrapStockDetailResponse } from "./stockDetailApi";

type RawKeywordNewsItem = {
  id?: number | null;
  title?: string | null;
  publisher?: string | null;
  publishedAt?: string | null;
  url?: string | null;
};

type RawKeywordItem = {
  id?: number | null;
  name?: string | null;
  news?: RawKeywordNewsItem[] | null;
};

type LegacyStockKeywordsPayload = {
  keywords?: Array<{
    id?: number | null;
    name?: string | null;
  }> | null;
  news?: RawKeywordNewsItem[] | null;
};

type RawStockKeywordsPayload = {
  keywords?: RawKeywordItem[] | null;
  news?: RawKeywordNewsItem[] | null;
};

function normalizeKeywordNewsItem(item: RawKeywordNewsItem): StockKeywordNewsItem {
  return {
    id: typeof item.id === "number" ? item.id : null,
    title: typeof item.title === "string" ? item.title : "",
    publisher: typeof item.publisher === "string" ? item.publisher : null,
    publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : null,
    url: typeof item.url === "string" ? item.url : null,
  };
}

function normalizeKeywordItem(item: RawKeywordItem): StockKeyword {
  return {
    id: typeof item.id === "number" ? item.id : null,
    name: typeof item.name === "string" ? item.name : "",
    news: Array.isArray(item.news) ? item.news.map(normalizeKeywordNewsItem) : [],
  };
}

function normalizeStockKeywordsPayload(payload: RawStockKeywordsPayload): StockKeywordsPayload {
  const keywords = Array.isArray(payload.keywords) ? payload.keywords : [];

  const hasNestedNews = keywords.some((item) => item && typeof item === "object" && Array.isArray(item.news));
  if (hasNestedNews) {
    return {
      keywords: keywords.map(normalizeKeywordItem),
    };
  }

  const legacyPayload = payload as LegacyStockKeywordsPayload;
  const legacyKeywords = Array.isArray(legacyPayload.keywords) ? legacyPayload.keywords : [];
  const legacyNews = Array.isArray(legacyPayload.news) ? legacyPayload.news.map(normalizeKeywordNewsItem) : [];

  return {
    keywords: legacyKeywords.map((item, index) => ({
      id: typeof item.id === "number" ? item.id : null,
      name: typeof item.name === "string" ? item.name : "",
      news: index === 0 ? legacyNews : [],
    })),
  };
}

export async function getStockKeywords(stockId: string) {
  const payload = await apiFetch<
    RawStockKeywordsPayload | StockDetailApiEnvelope<RawStockKeywordsPayload>
  >(`/api/stocks/${stockId}/keywords`, {
    cache: "no-store",
  });

  return normalizeStockKeywordsPayload(
    unwrapStockDetailResponse(payload, "종목 키워드 응답이 올바르지 않습니다."),
  );
}
