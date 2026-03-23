package com.sallaemallae.backend.domain.stock.controller;

import com.sallaemallae.backend.domain.stock.dto.StockBasicInfoResponse;
import com.sallaemallae.backend.domain.stock.dto.StockAnnouncementDetailResponse;
import com.sallaemallae.backend.domain.stock.dto.StockAnnouncementsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockDataPipelinePreviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockFinancialsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockIndicatorsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockKeywordsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockListResponse;
import com.sallaemallae.backend.domain.stock.dto.StockOverviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockPeriodPriceResponse;
import com.sallaemallae.backend.domain.stock.dto.StockQuoteResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeMinutePipelinePreviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeMinuteSnapshotResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeSubscriptionResponse;
import com.sallaemallae.backend.domain.stock.service.StockMarketQueryService;
import com.sallaemallae.backend.domain.stock.service.StockRealtimeMinuteService;
import com.sallaemallae.backend.domain.stock.service.StockService;
import com.sallaemallae.backend.domain.stock.service.StockTopListService;
import com.sallaemallae.backend.global.response.ApiResponse;
import java.util.List;
import com.sallaemallae.backend.global.security.AuthenticatedUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Stock Detail", description = "Stock basic info and market data APIs")
@SecurityRequirements
@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockApiController {

  private final StockService stockService;
  private final StockTopListService stockTopListService;
  private final StockMarketQueryService stockMarketQueryService;
  private final StockRealtimeMinuteService stockRealtimeMinuteService;
  private final AuthenticatedUserProvider authenticatedUserProvider;

  @Operation(
      summary = "Get top stock list",
      description = "Returns a paginated stock list backed by live KIS ranking data or local market snapshots depending on sort."
  )
  @GetMapping
  public ApiResponse<StockListResponse> getTopStocks(
      @Parameter(description = "Signal filter. Allowed values: BUY, SELL, HOLD", example = "BUY")
      @RequestParam(required = false) String signal,
      @Parameter(description = "Sector filter. Multiple values allowed. Example: SEMICONDUCTOR, ENERGY", example = "SEMICONDUCTOR")
      @RequestParam(required = false) List<String> sector,
      @Parameter(description = "Market cap filter. Allowed values: ALL, LARGE, MID", example = "ALL")
      @RequestParam(name = "market_cap", required = false) String marketCap,
      @Parameter(
          description = "Sort order. Allowed values: MARKET_CAP, CHANGE, TRADING_VALUE, TRADING_VOLUME, DIVIDEND_YIELD",
          example = "TRADING_VALUE"
      )
      @RequestParam(required = false) String sort,
      @Parameter(description = "Keyword filter applied to ticker, name, and sector", example = "Samsung")
      @RequestParam(required = false) String keyword,
      @Parameter(description = "Zero-based offset", example = "0")
      @RequestParam(defaultValue = "0") Integer offset,
      @Parameter(description = "Page size", example = "6")
      @RequestParam(defaultValue = "6") Integer limit
  ) {
    return ApiResponse.success(stockTopListService.getTopStocks(
        authenticatedUserProvider.getCurrentUserIdOrNull(),
        signal,
        sector,
        marketCap,
        sort,
        keyword,
        offset,
        limit
    ));
  }

  @Operation(summary = "Get stock basic info", description = "Returns the basic stock info for the given stockId.")
  @GetMapping("/{stockId}")
  public ApiResponse<StockBasicInfoResponse> getStockBasicInfo(
      @Parameter(description = "Stock ID", example = "1")
      @PathVariable Long stockId
  ) {
    return ApiResponse.success(stockService.getStockBasicInfo(stockId));
  }

  @Operation(summary = "Get stock overview", description = "Returns stock overview including latest price and 52-week range.")
  @GetMapping("/{stockId}/overview")
  public ApiResponse<StockOverviewResponse> getStockOverview(
      @Parameter(description = "Stock ID", example = "1")
      @PathVariable Long stockId
  ) {
    return ApiResponse.success(stockService.getStockOverview(stockId));
  }

  @Operation(summary = "Get stock indicators", description = "Returns valuation, earnings and dividend indicators for the given stockId.")
  @GetMapping("/{stockId}/indicators")
  public ApiResponse<StockIndicatorsResponse> getStockIndicators(
      @Parameter(description = "Stock ID", example = "1")
      @PathVariable Long stockId
  ) {
    return ApiResponse.success(stockService.getStockIndicators(stockId));
  }

  @Operation(summary = "Get stock financials", description = "Returns yearly or quarterly financials for the given stockId.")
  @GetMapping("/{stockId}/financials")
  public ApiResponse<StockFinancialsResponse> getStockFinancials(
      @Parameter(description = "Stock ID", example = "1")
      @PathVariable Long stockId,
      @Parameter(description = "Financial type: YEARLY or QUARTERLY", example = "YEARLY")
      @RequestParam(defaultValue = "YEARLY") String type
  ) {
    return ApiResponse.success(stockService.getStockFinancials(stockId, type));
  }

  @Operation(summary = "Get stock keywords", description = "Returns top keywords and related news for the given stockId.")
  @GetMapping("/{stockId}/keywords")
  public ApiResponse<StockKeywordsResponse> getStockKeywords(
      @Parameter(description = "Stock ID", example = "1")
      @PathVariable Long stockId
  ) {
    return ApiResponse.success(stockService.getStockKeywords(stockId));
  }

  @Operation(summary = "Get stock announcements", description = "Returns latest announcements for the given stockId.")
  @GetMapping("/{stockId}/announcements")
  public ApiResponse<StockAnnouncementsResponse> getStockAnnouncements(
      @Parameter(description = "Stock ID", example = "1")
      @PathVariable Long stockId,
      @Parameter(description = "Number of announcements to return", example = "4")
      @RequestParam(defaultValue = "4") int limit,
      @Parameter(description = "Offset for pagination", example = "0")
      @RequestParam(defaultValue = "0") int offset
  ) {
    return ApiResponse.success(stockService.getStockAnnouncements(stockId, limit, offset));
  }

  @Operation(summary = "Get stock announcement detail", description = "Returns announcement detail for the given stockId and announcementId.")
  @GetMapping("/{stockId}/announcements/{announcementId}")
  public ApiResponse<StockAnnouncementDetailResponse> getStockAnnouncement(
      @Parameter(description = "Stock ID", example = "1")
      @PathVariable Long stockId,
      @Parameter(description = "Announcement ID", example = "10")
      @PathVariable Long announcementId
  ) {
    return ApiResponse.success(stockService.getStockAnnouncement(stockId, announcementId));
  }

  @Operation(summary = "Get stock quote", description = "Returns the latest KIS quote for the given ticker.")
  @GetMapping("/{ticker}/quote")
  public ApiResponse<StockQuoteResponse> getQuote(
      @Parameter(description = "Stock ticker", example = "005930")
      @PathVariable String ticker,
      @Parameter(description = "Market code", example = "J")
      @RequestParam(defaultValue = "J") String market
  ) {
    return ApiResponse.success(stockMarketQueryService.getQuote(ticker, market));
  }

  @Operation(summary = "Get period prices", description = "Returns KIS period price candles for the given ticker.")
  @GetMapping("/{ticker}/period-prices")
  public ApiResponse<StockPeriodPriceResponse> getPeriodPrices(
      @Parameter(description = "Stock ticker", example = "005930")
      @PathVariable String ticker,
      @Parameter(description = "Market code", example = "J")
      @RequestParam(defaultValue = "J") String market,
      @Parameter(description = "Period code", example = "D")
      @RequestParam(defaultValue = "D") String period,
      @Parameter(description = "Start date (yyyyMMdd)", example = "20260310")
      @RequestParam String startDate,
      @Parameter(description = "End date (yyyyMMdd)", example = "20260317")
      @RequestParam String endDate,
      @RequestParam(defaultValue = "true") boolean adjusted
  ) {
    return ApiResponse.success(
        stockMarketQueryService.getPeriodPrices(ticker, market, period, startDate, endDate, adjusted)
    );
  }

  @GetMapping("/{ticker}/pipeline-preview")
  public ApiResponse<StockDataPipelinePreviewResponse> previewPipeline(
      @PathVariable String ticker,
      @RequestParam(defaultValue = "J") String market,
      @RequestParam(defaultValue = "D") String period,
      @RequestParam String startDate,
      @RequestParam String endDate,
      @RequestParam(defaultValue = "true") boolean adjusted
  ) {
    return ApiResponse.success(
        stockMarketQueryService.previewStoragePipeline(ticker, market, period, startDate, endDate, adjusted)
    );
  }

  @Operation(summary = "Subscribe realtime stock feed", description = "Subscribes the ticker to the KIS realtime websocket feed.")
  @PostMapping("/{ticker}/realtime/subscribe")
  public ApiResponse<StockRealtimeSubscriptionResponse> subscribeRealtime(
      @Parameter(description = "Stock ticker", example = "005930")
      @PathVariable String ticker,
      @Parameter(description = "Market code", example = "J")
      @RequestParam(defaultValue = "J") String market
  ) {
    return ApiResponse.success(stockRealtimeMinuteService.subscribe(ticker, market));
  }

  @Operation(summary = "Get realtime minute candles", description = "Returns the in-memory realtime minute candle snapshot.")
  @GetMapping("/{ticker}/realtime/minute-candles")
  public ApiResponse<StockRealtimeMinuteSnapshotResponse> getRealtimeMinuteCandles(
      @Parameter(description = "Stock ticker", example = "005930")
      @PathVariable String ticker,
      @Parameter(description = "Market code", example = "J")
      @RequestParam(defaultValue = "J") String market,
      @RequestParam(defaultValue = "5") int limit
  ) {
    return ApiResponse.success(stockRealtimeMinuteService.getSnapshot(ticker, market, limit));
  }

  @GetMapping("/{ticker}/realtime/pipeline-preview")
  public ApiResponse<StockRealtimeMinutePipelinePreviewResponse> previewRealtimePipeline(
      @PathVariable String ticker,
      @RequestParam(defaultValue = "J") String market,
      @RequestParam(defaultValue = "5") int limit
  ) {
    return ApiResponse.success(stockRealtimeMinuteService.previewStoragePipeline(ticker, market, limit));
  }
}
