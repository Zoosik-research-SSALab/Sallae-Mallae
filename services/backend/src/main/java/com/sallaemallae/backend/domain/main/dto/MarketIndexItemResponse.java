package com.sallaemallae.backend.domain.main.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record MarketIndexItemResponse(
    float value,
    float changeRate
) {
}
