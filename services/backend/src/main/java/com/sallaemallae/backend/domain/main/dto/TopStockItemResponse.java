package com.sallaemallae.backend.domain.main.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TopStockItemResponse(
    int rank,
    Long stockId,
    String name,
    int price,
    float fluctuationRate,
    String signal,
    int confidence,
    boolean isWatchlisted
) {
}
