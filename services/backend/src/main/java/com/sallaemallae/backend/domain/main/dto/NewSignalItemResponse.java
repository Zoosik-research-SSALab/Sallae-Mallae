package com.sallaemallae.backend.domain.main.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record NewSignalItemResponse(
    Long stockId,
    String ticker,
    String name,
    int confidence,
    int price,
    float fluctuationRate,
    boolean isWatchlisted
) {
}
