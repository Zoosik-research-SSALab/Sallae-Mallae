import { NextRequest, NextResponse } from "next/server";
import { getMockNewsDetail } from "@/app/news/utils/mockNewsData";
import { getNewsStockTicker } from "@/app/news/utils/newsConstants";
import { getMockWatchlistNews } from "@/shared/lib/mockWatchlistStore";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

function isEnabled(rawValue: string | undefined) {
  const value = rawValue?.trim().toLowerCase();
  return value === "true" || value === "enabled";
}

function isDisabled(rawValue: string | undefined) {
  const value = rawValue?.trim().toLowerCase();
  return value === "false" || value === "disabled";
}

function shouldUseMockNewsApi() {
  const explicit = process.env.NEXT_PUBLIC_USE_API_MOCK;
  if (isEnabled(explicit)) {
    return true;
  }

  if (isDisabled(explicit)) {
    return false;
  }

  return !isDisabled(process.env.NEXT_PUBLIC_API_MOCKING);
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || process.env.AUTH_API_BASE_URL?.trim() || "https://j14d208.p.ssafy.io";
  return normalizeBaseUrl(configured);
}

function getMockWatchlistNewsDetail(newsId: number) {
  const matchedNews = getMockWatchlistNews().news.find((item) => item.id === newsId);

  if (!matchedNews) {
    return null;
  }

  return {
    id: matchedNews.id,
    title: matchedNews.title,
    snippet: matchedNews.summary,
    publisher: matchedNews.source,
    publishedAt: matchedNews.publishedAt,
    url: matchedNews.url ?? null,
    relatedStocks: matchedNews.relatedStocks.map((stockName, index) => {
      const ticker = getNewsStockTicker(stockName) ?? `MOCK${String(index + 1).padStart(3, "0")}`;
      const numericId = Number.parseInt(ticker.replace(/\D/g, ""), 10);

      return {
        id: Number.isFinite(numericId) ? numericId : index + 1,
        name: stockName,
        ticker,
      };
    }),
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ newsId: string }> },
) {
  const { newsId } = await context.params;
  const parsedNewsId = Number.parseInt(newsId, 10);

  if (!Number.isFinite(parsedNewsId) || parsedNewsId <= 0) {
    return NextResponse.json({ message: "유효하지 않은 뉴스 ID입니다." }, { status: 400 });
  }

  if (shouldUseMockNewsApi()) {
    const detail = getMockNewsDetail(parsedNewsId) ?? getMockWatchlistNewsDetail(parsedNewsId);

    if (!detail) {
      return NextResponse.json({ message: "뉴스를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(snakelizeKeys(detail));
  }

  const headers = new Headers();
  const accept = request.headers.get("accept");
  const cookie = request.headers.get("cookie");

  if (accept) {
    headers.set("Accept", accept);
  }

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const upstreamResponse = await fetch(`${getApiBaseUrl()}/api/news/${parsedNewsId}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const response = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
  });

  const upstreamContentType = upstreamResponse.headers.get("content-type");
  if (upstreamContentType) {
    response.headers.set("content-type", upstreamContentType);
  }

  return response;
}
