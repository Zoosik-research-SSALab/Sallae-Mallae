package com.sallaemallae.backend.domain.stock.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TrendingStockItemResponse(
    int rank,
    Long stockId,
    String name,
    Integer price,
    Float fluctuationRate,
    String iconUrl
) {
}
