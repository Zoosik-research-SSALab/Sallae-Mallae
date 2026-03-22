package com.sallaemallae.backend.domain.stock.controller;

import com.sallaemallae.backend.domain.stock.dto.StockPricesResponse;
import com.sallaemallae.backend.domain.stock.service.StockPriceStreamService;
import com.sallaemallae.backend.global.exception.BusinessException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Tag(name = "Stock Stream", description = "Stock chart streaming APIs")
@SecurityRequirements
@RestController
@RequestMapping("/api/stream/stocks")
@RequiredArgsConstructor
public class StockPriceStreamController {

  private static final long SSE_ERROR_TIMEOUT_MILLIS = Duration.ofMinutes(30).toMillis();

  private final StockPriceStreamService stockPriceStreamService;

  @Operation(
      summary = "Get stock chart prices with cursor pagination",
      description = "Returns candle data for the requested type. "
          + "Allowed candleType: MINUTE, DAILY, WEEKLY, MONTHLY, YEARLY. "
          + "Use cursor for pagination (oldest timestamp from previous response)."
  )
  @GetMapping("/{stockId}/prices")
  public ResponseEntity<StockPricesResponse> getStockPrices(
      @Parameter(description = "Stock ID", example = "1")
      @PathVariable Long stockId,
      @Parameter(description = "Candle type: MINUTE, DAILY, WEEKLY, MONTHLY, YEARLY", example = "DAILY")
      @RequestParam(defaultValue = "DAILY") String candleType,
      @Parameter(description = "Cursor for pagination (oldest date from previous page)", example = "2024-01-01")
      @RequestParam(required = false) String cursor
  ) {
    return ResponseEntity.ok(stockPriceStreamService.getLatestPrices(stockId, candleType, cursor));
  }

  @Operation(
      summary = "Stream stock chart prices via SSE",
      description = "Streams minute candle data over SSE every minute. Only MINUTE type supports streaming."
  )
  @GetMapping(value = "/{stockId}/prices/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter streamStockPrices(
      @Parameter(description = "Stock ID", example = "1")
      @PathVariable Long stockId,
      @Parameter(description = "Candle type (only MINUTE supports streaming)", example = "MINUTE")
      @RequestParam(defaultValue = "MINUTE") String candleType
  ) {
    try {
      return stockPriceStreamService.streamPrices(stockId, candleType);
    } catch (BusinessException e) {
      return buildErrorEmitter(e);
    }
  }

  private SseEmitter buildErrorEmitter(BusinessException e) {
    SseEmitter emitter = new SseEmitter(SSE_ERROR_TIMEOUT_MILLIS);
    try {
      emitter.send(SseEmitter.event()
          .name("error")
          .data(Map.of(
              "code", e.getErrorCode().getCode(),
              "message", e.getErrorCode().getMessage(),
              "status", e.getErrorCode().getStatus()
          )));
      emitter.complete();
    } catch (IOException ioException) {
      emitter.completeWithError(ioException);
    }
    return emitter;
  }
}
