package com.sallaemallae.backend.domain.stock.controller;

import com.sallaemallae.backend.domain.stock.dto.StockDataPipelinePreviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockPeriodPriceResponse;
import com.sallaemallae.backend.domain.stock.dto.StockQuoteResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeMinutePipelinePreviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeMinuteSnapshotResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeSubscriptionResponse;
import com.sallaemallae.backend.domain.stock.service.StockMarketQueryService;
import com.sallaemallae.backend.domain.stock.service.StockRealtimeMinuteService;
import com.sallaemallae.backend.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/stocks")
@RequiredArgsConstructor
public class StockMarketController {

  private final StockMarketQueryService stockMarketQueryService;
  private final StockRealtimeMinuteService stockRealtimeMinuteService;

  @GetMapping("/{ticker}/quote")
  public ApiResponse<StockQuoteResponse> getQuote(
      @PathVariable String ticker,
      @RequestParam(defaultValue = "J") String market
  ) {
    return ApiResponse.success(stockMarketQueryService.getQuote(ticker, market));
  }

  @GetMapping("/{ticker}/period-prices")
  public ApiResponse<StockPeriodPriceResponse> getPeriodPrices(
      @PathVariable String ticker,
      @RequestParam(defaultValue = "J") String market,
      @RequestParam(defaultValue = "D") String period,
      @RequestParam String startDate,
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

  @PostMapping("/{ticker}/realtime/subscribe")
  public ApiResponse<StockRealtimeSubscriptionResponse> subscribeRealtime(
      @PathVariable String ticker,
      @RequestParam(defaultValue = "J") String market
  ) {
    return ApiResponse.success(stockRealtimeMinuteService.subscribe(ticker, market));
  }

  @GetMapping("/{ticker}/realtime/minute-candles")
  public ApiResponse<StockRealtimeMinuteSnapshotResponse> getRealtimeMinuteCandles(
      @PathVariable String ticker,
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
