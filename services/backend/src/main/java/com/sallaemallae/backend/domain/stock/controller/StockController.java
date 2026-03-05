package com.sallaemallae.backend.domain.stock.controller;

import com.sallaemallae.backend.domain.stock.dto.StockDetailResponse;
import com.sallaemallae.backend.domain.stock.dto.StockSummaryResponse;
import com.sallaemallae.backend.domain.stock.service.StockService;
import com.sallaemallae.backend.global.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/stocks")
@RequiredArgsConstructor
public class StockController {

  private final StockService stockService;

  @GetMapping
  public ApiResponse<List<StockSummaryResponse>> getStocks() {
    return ApiResponse.success(stockService.getAllStocks());
  }

  @GetMapping("/{ticker}")
  public ApiResponse<StockDetailResponse> getStock(@PathVariable String ticker) {
    return ApiResponse.success(stockService.getStockDetail(ticker));
  }
}
