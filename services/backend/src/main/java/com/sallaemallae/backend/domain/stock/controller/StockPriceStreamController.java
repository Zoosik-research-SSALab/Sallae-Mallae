package com.sallaemallae.backend.domain.stock.controller;

import com.sallaemallae.backend.domain.stock.service.StockPriceStreamService;
import com.sallaemallae.backend.global.exception.BusinessException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
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

  private final StockPriceStreamService stockPriceStreamService;

  @Operation(
      summary = "Stream stock chart prices",
      description = "Streams chart data over SSE every minute for the requested period."
  )
  @GetMapping(value = "/{stockId}/prices", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter streamStockPrices(
      @Parameter(description = "Stock ID", example = "1")
      @PathVariable Long stockId,
      @Parameter(description = "Chart period. Allowed values: 1MIN, 1D, 1W, 1M, 3M, 1Y, 3Y", example = "1D")
      @RequestParam(defaultValue = "1D") String period
  ) {
    try {
      return stockPriceStreamService.streamPrices(stockId, period);
    } catch (BusinessException e) {
      return buildErrorEmitter(e);
    }
  }

  private SseEmitter buildErrorEmitter(BusinessException e) {
    SseEmitter emitter = new SseEmitter(0L);
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
