package com.sallaemallae.backend.domain.stock.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Schema(description = "Top stock list item")
public record StockListItemResponse(
    @Schema(description = "Display rank after filters and sorting", example = "1")
    int rank,
    @Schema(description = "Resolved stock ID if available", example = "1", nullable = true)
    Long id,
    @Schema(description = "Stock ticker", example = "005930")
    String ticker,
    @Schema(description = "Stock name", example = "Samsung Electronics")
    String name,
    @Schema(description = "GICS sector or mapped sector label", example = "Information Technology", nullable = true)
    String gicsSector,
    @Schema(description = "Current price", example = "72500")
    Integer price,
    @Schema(description = "Fluctuation rate", example = "2.15")
    Float fluctuationRate,
    @Schema(description = "Trading value", example = "582000000000", nullable = true)
    Long tradingValue,
    @Schema(description = "Trading volume", example = "3450000", nullable = true)
    Long tradingVolume,
    @Schema(description = "Dividend yield", example = "1.85", nullable = true)
    Float dividendYield,
    @Schema(description = "Derived trading signal", example = "BUY")
    String signal,
    @Schema(description = "Derived confidence score", example = "87")
    int confidence,
    @Schema(description = "Whether the stock is watchlisted by the current user", example = "false")
    boolean isWatchlisted,
    @Schema(description = "Stock icon URL", example = "https://minio.example.com/assets/stock-icons/삼성전자_005930.png", nullable = true)
    String iconUrl
) {
}
