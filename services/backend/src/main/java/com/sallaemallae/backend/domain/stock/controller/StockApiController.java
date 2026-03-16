package com.sallaemallae.backend.domain.stock.controller;

import com.sallaemallae.backend.domain.stock.dto.StockBasicInfoResponse;
import com.sallaemallae.backend.domain.stock.dto.StockListResponse;
import com.sallaemallae.backend.domain.stock.service.StockService;
import com.sallaemallae.backend.domain.stock.service.StockTopListService;
import com.sallaemallae.backend.global.response.ApiResponse;
import com.sallaemallae.backend.global.security.AuthenticatedUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Stock Detail", description = "Stock basic info and chart streaming APIs")
@SecurityRequirements
@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockApiController {

  private final StockService stockService;
  private final StockTopListService stockTopListService;
  private final AuthenticatedUserProvider authenticatedUserProvider;

  @Operation(
      summary = "Get top stock list",
      description = "Returns a paginated Top200 list with live KIS ranking data and in-memory filters."
  )
  @GetMapping
  public ApiResponse<StockListResponse> getTopStocks(
      @Parameter(description = "Signal filter. Allowed values: BUY, SELL, HOLD", example = "BUY")
      @RequestParam(required = false) String signal,
      @Parameter(description = "Sector filter. Allowed values: IT, 금융, 자동차, 바이오, 2차전지", example = "IT")
      @RequestParam(required = false) String sector,
      @Parameter(description = "Market cap filter. Allowed values: ALL, LARGE, MID", example = "ALL")
      @RequestParam(name = "market_cap", required = false) String marketCap,
      @Parameter(description = "Sort order. Allowed values: MARKET_CAP, CHANGE", example = "CHANGE")
      @RequestParam(required = false) String sort,
      @Parameter(description = "Keyword filter applied to ticker, name, and sector", example = "삼성")
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
}
