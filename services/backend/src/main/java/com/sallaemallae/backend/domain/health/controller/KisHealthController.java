package com.sallaemallae.backend.domain.health.controller;

import com.sallaemallae.backend.domain.health.dto.KisHealthResponse;
import com.sallaemallae.backend.domain.health.service.KisHealthService;
import com.sallaemallae.backend.domain.stock.dto.StockDataPipelinePreviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeMinutePipelinePreviewResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeMinuteSnapshotResponse;
import com.sallaemallae.backend.domain.stock.dto.StockRealtimeSubscriptionResponse;
import com.sallaemallae.backend.domain.stock.service.StockMarketQueryService;
import com.sallaemallae.backend.domain.stock.service.StockRealtimeMinuteService;
import com.sallaemallae.backend.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal/kis")
@RequiredArgsConstructor
public class KisHealthController {

  private final KisHealthService kisHealthService;
  private final StockMarketQueryService stockMarketQueryService;
  private final StockRealtimeMinuteService stockRealtimeMinuteService;

  @GetMapping
  public ApiResponse<KisHealthResponse> check(
      @RequestParam(defaultValue = "005930") String ticker
  ) {
    return ApiResponse.success(kisHealthService.check(ticker));
  }

  @GetMapping("/pipeline-preview")
  public ApiResponse<StockDataPipelinePreviewResponse> previewPipeline(
      @RequestParam(defaultValue = "005930") String ticker,
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

  @PostMapping("/realtime/subscribe")
  public ApiResponse<StockRealtimeSubscriptionResponse> subscribeRealtime(
      @RequestParam(defaultValue = "005930") String ticker,
      @RequestParam(defaultValue = "J") String market
  ) {
    return ApiResponse.success(stockRealtimeMinuteService.subscribe(ticker, market));
  }

  @GetMapping("/realtime/minute-candles")
  public ApiResponse<StockRealtimeMinuteSnapshotResponse> getRealtimeMinuteCandles(
      @RequestParam(defaultValue = "005930") String ticker,
      @RequestParam(defaultValue = "J") String market,
      @RequestParam(defaultValue = "5") int limit
  ) {
    return ApiResponse.success(stockRealtimeMinuteService.getSnapshot(ticker, market, limit));
  }

  @GetMapping("/realtime/pipeline-preview")
  public ApiResponse<StockRealtimeMinutePipelinePreviewResponse> previewRealtimePipeline(
      @RequestParam(defaultValue = "005930") String ticker,
      @RequestParam(defaultValue = "J") String market,
      @RequestParam(defaultValue = "5") int limit
  ) {
    return ApiResponse.success(stockRealtimeMinuteService.previewStoragePipeline(ticker, market, limit));
  }
}
