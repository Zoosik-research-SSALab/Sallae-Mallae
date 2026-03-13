package com.sallaemallae.backend.domain.stock.controller;

import com.sallaemallae.backend.domain.stock.dto.StockDetailResponse;
import com.sallaemallae.backend.domain.stock.dto.StockSummaryResponse;
import com.sallaemallae.backend.domain.stock.service.StockService;
import com.sallaemallae.backend.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Stocks", description = "Stock lookup APIs")
@RestController
@RequestMapping("/api/v1/stocks")
@RequiredArgsConstructor
public class StockController {

  private final StockService stockService;

  @Operation(summary = "Get stock list", description = "Returns active stock summary items.")
  @GetMapping
  public ApiResponse<List<StockSummaryResponse>> getStocks() {
    return ApiResponse.success(stockService.getAllStocks());
  }

  @Operation(summary = "Get stock detail", description = "Returns stock detail information by ticker.")
  @GetMapping("/{ticker}")
  public ApiResponse<StockDetailResponse> getStock(
      @Parameter(description = "Stock ticker", example = "005930")
      @PathVariable String ticker
  ) {
    return ApiResponse.success(stockService.getStockDetail(ticker));
  }
}
