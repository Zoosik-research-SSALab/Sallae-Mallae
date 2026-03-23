package com.sallaemallae.backend.domain.stock.controller;

import com.sallaemallae.backend.domain.stock.dto.StockPricesResponse;
import com.sallaemallae.backend.domain.stock.service.StockPriceStreamService;
import com.sallaemallae.backend.domain.stock.service.StockService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Stock Chart", description = "Frontend-facing stock chart APIs — use these for chart rendering")
@SecurityRequirements
@RestController
@RequestMapping("/api/stream/stocks")
@RequiredArgsConstructor
public class StockPriceStreamController {

  private final StockPriceStreamService stockPriceStreamService;
  private final StockService stockService;

  @Operation(
      summary = "Get stock chart prices with cursor pagination",
      description = "Primary API for chart rendering. Returns candle data from DB with realtime merge. "
          + "Allowed candleType: MINUTE, DAILY, WEEKLY, MONTHLY, YEARLY. "
          + "Use cursor for pagination (oldest timestamp from previous response)."
  )
  @GetMapping("/{ticker}/prices")
  public ResponseEntity<StockPricesResponse> getStockPrices(
      @Parameter(description = "Stock ticker", example = "005930")
      @PathVariable String ticker,
      @Parameter(description = "Candle type: MINUTE, DAILY, WEEKLY, MONTHLY, YEARLY", example = "DAILY")
      @RequestParam(defaultValue = "DAILY") String candleType,
      @Parameter(description = "Cursor for pagination (oldest date from previous page)", example = "2024-01-01")
      @RequestParam(required = false) String cursor
  ) {
    Long stockId = stockService.resolveStockId(ticker);
    return ResponseEntity.ok(stockPriceStreamService.getLatestPrices(stockId, candleType, cursor));
  }
}
