package com.sallaemallae.backend.domain.stock.controller;

import com.sallaemallae.backend.domain.stock.service.StockQuoteSseService;
import com.sallaemallae.backend.domain.stock.service.TrendingStockService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Tag(name = "Stock Stream", description = "SSE streaming APIs for realtime stock data")
@SecurityRequirements
@RestController
@RequestMapping("/api/stream/stocks")
@RequiredArgsConstructor
public class StockStreamController {

  private final StockQuoteSseService stockQuoteSseService;
  private final TrendingStockService trendingStockService;

  /** 실시간 인기 검색 종목 TOP5 (SSE) */
  @Operation(summary = "인기 검색 종목 TOP5 실시간 스트림", description = "검색 횟수 기반 인기 종목 상위 5개를 SSE로 스트리밍합니다.")
  @GetMapping(value = "/trending", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter streamTrendingStocks() {
      return trendingStockService.streamTrending();
  }

  @Operation(summary = "Stream stock quote via SSE", description = "Realtime stock quote stream. Pushes StockQuoteResponse on every trade tick from KIS WebSocket.")
  @GetMapping(value = "/{ticker}/quote", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter streamQuote(
      @Parameter(description = "Stock ticker", example = "005930")
      @PathVariable String ticker,
      @Parameter(description = "Market code", example = "J")
      @RequestParam(defaultValue = "J") String market
  ) {
    return stockQuoteSseService.streamQuote(ticker, market);
  }
}
