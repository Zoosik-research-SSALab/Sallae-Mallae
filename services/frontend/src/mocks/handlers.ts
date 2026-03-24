import { http, HttpResponse } from "msw";
import {
  getCategoriesMock,
  getMarketIndexMock,
  getNewSignalsMock,
  getPopularSearchesMock,
  getTopStocksMock,
} from "@/shared/lib/mockMainData";
import {
  addMockWatchlist,
  getMockWatchlistNews,
  getMockWatchlistSnapshot,
  getMockWatchlistStatus,
  removeMockWatchlist,
  toggleMockWatchlistNotification,
} from "@/shared/lib/mockWatchlistStore";
import {
  getMockPortfolioChairmanResponse,
  getMockPortfolioHallOfFameResponse,
} from "@/app/portfolio/utils/mockPortfolioData";
import {
  getMockReportResponse,
  getMockPerformanceResponse,
  getMockTradesResponse,
} from "@/app/portfolio/[ticker]/utils/mockApiData";
import { getMockStocksResponse } from "@/app/stocks/utils/mockStocksData";
import {
  getMockAnnouncementDetail,
  getMockAnnouncements,
  getMockStockFinancials,
  getMockStockIndicators,
  getMockStockKeywords,
  getMockStockOverview,
  getMockStockPrices,
} from "@/app/stocks/utils/mockStockDetailData";
import { getSignalsMock } from "@/app/signals/utils/mockSignalsData";
import {
  getMockNewsResponse,
  getMockNewsSearchResponse,
  NEWS_PAGE_SIZE,
} from "@/app/news/utils/mockNewsData";
import { parseNewsNumberParam } from "@/app/news/utils/newsQueryUtils";
import { camelizeKeys, snakelizeKeys } from "@/shared/utils/case";
import { ALL_SECTOR, STOCK_PAGE_SIZE } from "@/app/stocks/utils/stocksFilters";
import type { StocksApiSort, StocksQueryParams } from "@/app/stocks/types/stocks";
import type {
  SignalMarketCapSize,
  SignalQueryFilter,
  SignalQuerySort,
  SignalSectorName,
  SignalsQueryParams,
} from "@/app/signals/types/signals";
import type { StockChartPeriod, StockFinancialType } from "@/app/stocks/types/stockDetail";
import type { NewsQueryParams } from "@/app/news/types/news";

// ─── Helpers ────────────────────────────────────────────────────────────────

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parsePositiveIntegerMin1(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}

function parseAnnounceInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function parseCategories(value: string | null): SignalSectorName[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((category) => decodeURIComponent(category).trim())
    .filter(Boolean) as SignalSectorName[];
}

// ─── Handlers ────────────────────────────────────────────────────────────────

const validStockSorts = new Set<StocksApiSort>([
  "TRADING_VALUE",
  "TRADING_VOLUME",
  "DIVIDEND_YIELD",
  "CHANGE",
]);

const validSignalFilters = new Set<SignalQueryFilter>(["ALL", "BUY", "SELL"]);
const validSignalSorts = new Set<SignalQuerySort>(["LATEST", "UP", "DOWN"]);
const validMarketCaps = new Set<SignalsQueryParams["marketCap"]>(["ALL", "LARGE", "MID"]);

const validStockPeriods = new Set<StockChartPeriod>([
  "1MIN",
  "1D",
  "1W",
  "1M",
  "1Y",
]);
const validFinancialTypes = new Set<StockFinancialType>(["YEARLY", "QUARTERLY"]);

export const handlers = [
  // ── Main / Home ────────────────────────────────────────────────────────────

  http.get("/api/main/top-stocks", () => {
    return HttpResponse.json(snakelizeKeys(getTopStocksMock()));
  }),

  http.get("/api/main/new-signals", () => {
    return HttpResponse.json(snakelizeKeys(getNewSignalsMock()));
  }),

  http.get("/api/main/market-index", () => {
    return HttpResponse.json(snakelizeKeys(getMarketIndexMock()));
  }),

  http.get("/api/main/categories", () => {
    return HttpResponse.json(snakelizeKeys(getCategoriesMock()));
  }),

  http.get("/api/main/popular-searches", () => {
    return HttpResponse.json(snakelizeKeys(getPopularSearchesMock()));
  }),

  // ── Stocks list ────────────────────────────────────────────────────────────

  http.get("/api/stocks", ({ request }) => {
    const searchParams = new URL(request.url).searchParams;
    const sort = searchParams.get("sort");
    const sectorsRaw = searchParams.get("sectors")?.trim() ?? "";
    const sectors = sectorsRaw
      ? sectorsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [ALL_SECTOR];

    const params: StocksQueryParams = {
      sectors,
      sort: validStockSorts.has(sort as StocksApiSort)
        ? (sort as StocksApiSort)
        : "TRADING_VALUE",
      offset: parsePositiveInteger(searchParams.get("offset"), 0),
      limit: Math.max(
        1,
        parsePositiveInteger(searchParams.get("limit"), STOCK_PAGE_SIZE),
      ),
    };

    return HttpResponse.json(snakelizeKeys(getMockStocksResponse(params)));
  }),

  // ── Stock detail ────────────────────────────────────────────────────────────

  http.get("/api/stocks/:stockId", ({ params }) => {
    const { stockId } = params as { stockId: string };

    if (!stockId) {
      return HttpResponse.json({ message: "stockId is required" }, { status: 400 });
    }

    return HttpResponse.json(snakelizeKeys(getMockStockOverview(stockId)));
  }),

  http.get("/api/stocks/:stockId/prices", ({ request, params }) => {
    const { stockId } = params as { stockId: string };
    const searchParams = new URL(request.url).searchParams;
    const period = searchParams.get("period");

    if (!stockId) {
      return HttpResponse.json({ message: "stockId is required" }, { status: 400 });
    }

    const safePeriod = validStockPeriods.has(period as StockChartPeriod)
      ? (period as StockChartPeriod)
      : "1D";

    return HttpResponse.json(snakelizeKeys(getMockStockPrices(stockId, safePeriod)));
  }),

  http.get("/api/stocks/:stockId/financials", ({ request, params }) => {
    const { stockId } = params as { stockId: string };
    const searchParams = new URL(request.url).searchParams;
    const type = searchParams.get("type");

    if (!stockId) {
      return HttpResponse.json({ message: "stockId is required" }, { status: 400 });
    }

    const safeType = validFinancialTypes.has(type as StockFinancialType)
      ? (type as StockFinancialType)
      : "YEARLY";

    return HttpResponse.json(snakelizeKeys(getMockStockFinancials(stockId, safeType)));
  }),

  http.get("/api/stocks/:stockId/indicators", ({ params }) => {
    const { stockId } = params as { stockId: string };

    if (!stockId) {
      return HttpResponse.json({ message: "stockId is required" }, { status: 400 });
    }

    return HttpResponse.json(snakelizeKeys(getMockStockIndicators(stockId)));
  }),

  http.get("/api/stocks/:stockId/keywords", ({ params }) => {
    const { stockId } = params as { stockId: string };

    if (!stockId) {
      return HttpResponse.json({ message: "stockId is required" }, { status: 400 });
    }

    return HttpResponse.json(snakelizeKeys(getMockStockKeywords(stockId)));
  }),

  http.get("/api/stocks/:stockId/announcements", ({ request, params }) => {
    const { stockId } = params as { stockId: string };
    const searchParams = new URL(request.url).searchParams;

    if (!stockId) {
      return HttpResponse.json({ message: "stockId is required" }, { status: 400 });
    }

    const limit = Math.max(
      1,
      parseAnnounceInteger(searchParams.get("limit"), 4),
    );
    const offset = parseAnnounceInteger(searchParams.get("offset"), 0);

    return HttpResponse.json(snakelizeKeys(getMockAnnouncements(stockId, limit, offset)));
  }),

  http.get("/api/stocks/:stockId/announcements/:announcementId", ({ params }) => {
    const { stockId, announcementId } = params as {
      stockId: string;
      announcementId: string;
    };
    const parsedAnnouncementId = Number(announcementId);

    if (!stockId || !Number.isFinite(parsedAnnouncementId)) {
      return HttpResponse.json({ message: "Invalid announcement request" }, { status: 400 });
    }

    const announcement = getMockAnnouncementDetail(stockId, parsedAnnouncementId);

    if (!announcement) {
      return HttpResponse.json({ message: "Announcement not found" }, { status: 404 });
    }

    return HttpResponse.json(snakelizeKeys(announcement));
  }),

  // ── Signals ────────────────────────────────────────────────────────────────

  http.get("/api/signals", ({ request }) => {
    const searchParams = new URL(request.url).searchParams;
    const filter = searchParams.get("filter");
    const sort = searchParams.get("sort");
    const marketCap = searchParams.get("market_cap");

    const params: SignalsQueryParams = {
      filter: validSignalFilters.has(filter as SignalQueryFilter)
        ? (filter as SignalQueryFilter)
        : "ALL",
      sort: validSignalSorts.has(sort as SignalQuerySort)
        ? (sort as SignalQuerySort)
        : "LATEST",
      offset: parsePositiveInteger(searchParams.get("offset"), 0),
      limit: Math.max(1, parsePositiveInteger(searchParams.get("limit"), 6)),
      categories: parseCategories(searchParams.get("categories")),
      marketCap: validMarketCaps.has(marketCap as SignalsQueryParams["marketCap"])
        ? (marketCap as SignalMarketCapSize | "ALL")
        : "ALL",
      keyword: searchParams.get("keyword")?.trim() ?? "",
    };

    return HttpResponse.json(snakelizeKeys(getSignalsMock(params)));
  }),

  // ── News ────────────────────────────────────────────────────────────────────

  http.get("/api/news", ({ request }) => {
    const searchParams = new URL(request.url).searchParams;

    const params: NewsQueryParams = {
      offset: parseNewsNumberParam(searchParams.get("offset"), 0),
      limit: parseNewsNumberParam(searchParams.get("limit"), NEWS_PAGE_SIZE, 1),
      keyword: searchParams.get("keyword")?.trim() ?? "",
    };

    return HttpResponse.json(snakelizeKeys(getMockNewsResponse(params)));
  }),

  http.get("/api/news/search", ({ request }) => {
    const searchParams = new URL(request.url).searchParams;
    const keyword = searchParams.get("keyword")?.trim() ?? "";
    const limit = parseNewsNumberParam(searchParams.get("limit"), 8, 1);

    return HttpResponse.json(snakelizeKeys(getMockNewsSearchResponse(keyword, limit)));
  }),

  // ── Portfolio ───────────────────────────────────────────────────────────────

  http.get("/api/portfolio/chairman", () => {
    return HttpResponse.json(
      snakelizeKeys({
        success: true,
        data: getMockPortfolioChairmanResponse(),
        error: null,
      }),
    );
  }),

  http.get("/api/portfolio/chairman/hall-of-fame", () => {
    return HttpResponse.json(
      snakelizeKeys({
        success: true,
        data: getMockPortfolioHallOfFameResponse(),
        error: null,
      }),
    );
  }),

  // ── Report ─────────────────────────────────────────────────────────────────

  http.get("/api/report/:stockId", ({ request, params }) => {
    const { stockId } = params as { stockId: string };
    const searchParams = new URL(request.url).searchParams;
    const offset = parsePositiveInteger(searchParams.get("offset"), 0);
    const limit = Math.max(1, parsePositiveInteger(searchParams.get("limit"), 6));

    return HttpResponse.json(snakelizeKeys(getMockReportResponse(stockId, offset, limit)));
  }),

  http.get("/api/report/:stockId/performance", ({ params }) => {
    const { stockId } = params as { stockId: string };

    return HttpResponse.json(snakelizeKeys(getMockPerformanceResponse(stockId)));
  }),

  http.get("/api/report/:stockId/performance/trades", ({ request, params }) => {
    const { stockId } = params as { stockId: string };
    const searchParams = new URL(request.url).searchParams;
    const offset = parsePositiveInteger(searchParams.get("offset"), 0);
    const limit = Math.max(1, parsePositiveInteger(searchParams.get("limit"), 10));

    return HttpResponse.json(snakelizeKeys(getMockTradesResponse(stockId, offset, limit)));
  }),

  // ── Watchlist ───────────────────────────────────────────────────────────────

  http.get("/api/users/watchlist", ({ request }) => {
    const searchParams = new URL(request.url).searchParams;
    const page = parsePositiveIntegerMin1(searchParams.get("page"), 1);
    const limit = parsePositiveIntegerMin1(searchParams.get("limit"), 5);

    return HttpResponse.json(snakelizeKeys(getMockWatchlistSnapshot({ page, limit })));
  }),

  http.post("/api/users/watchlist", async ({ request }) => {
    let body: { stockId?: number } = {};

    try {
      const raw = (await request.json()) as Record<string, unknown>;
      body = camelizeKeys<{ stockId?: number }>(raw);
    } catch {
      body = {};
    }

    if (typeof body.stockId !== "number") {
      return HttpResponse.json({ message: "stock_id is required" }, { status: 400 });
    }

    return HttpResponse.json(snakelizeKeys(addMockWatchlist(body.stockId)));
  }),

  http.get("/api/users/watchlist/:stockId", ({ params }) => {
    const stockId = Number(params.stockId);

    if (!Number.isFinite(stockId)) {
      return HttpResponse.json({ message: "Invalid stockId" }, { status: 400 });
    }

    return HttpResponse.json(snakelizeKeys(getMockWatchlistStatus(stockId)));
  }),

  http.delete("/api/users/watchlist/:stockId", ({ params }) => {
    const stockId = Number(params.stockId);

    if (!Number.isFinite(stockId)) {
      return HttpResponse.json({ message: "Invalid stockId" }, { status: 400 });
    }

    return HttpResponse.json(snakelizeKeys(removeMockWatchlist(stockId)));
  }),

  http.patch("/api/users/watchlist/:stockId", ({ params }) => {
    const stockId = Number(params.stockId);

    if (!Number.isFinite(stockId)) {
      return HttpResponse.json({ message: "Invalid stockId" }, { status: 400 });
    }

    const status = getMockWatchlistStatus(stockId);

    if (!status.isWatched) {
      return HttpResponse.json({ message: "Watchlist entry not found" }, { status: 404 });
    }

    return HttpResponse.json(snakelizeKeys(toggleMockWatchlistNotification(stockId)));
  }),

  http.get("/api/users/watchlist/news", () => {
    return HttpResponse.json(snakelizeKeys(getMockWatchlistNews()));
  }),

  // ── Auth (mock responses only — no cookie handling in MSW) ─────────────────

  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string } | null;

    if (!body?.email || !body.password) {
      return HttpResponse.json(
        { message: "이메일과 비밀번호를 모두 입력해 주세요." },
        { status: 400 },
      );
    }

    return HttpResponse.json({
      access_token: "mock-access-token",
      token_type: "Bearer",
      expires_in: 3600,
      user: {
        user_id: 1000,
        email: body.email,
        nickname: String(body.email).split("@")[0] ?? "user",
        profile_image_url: null,
        provider: "email",
        role: "USER",
        last_login_at: new Date().toISOString(),
      },
    });
  }),

  http.post("/api/auth/logout", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/auth/me", ({ request }) => {
    const authorization = request.headers.get("authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return HttpResponse.json(
        { code: "AUTH_001", message: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    return HttpResponse.json({
      user: {
        user_id: 1000,
        email: "mock@example.com",
        nickname: "mock",
        profile_image_url: null,
        provider: "email",
        role: "USER",
        last_login_at: new Date().toISOString(),
      },
    });
  }),
];
