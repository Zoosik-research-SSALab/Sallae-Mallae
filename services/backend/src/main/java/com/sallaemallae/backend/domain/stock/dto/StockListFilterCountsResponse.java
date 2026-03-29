package com.sallaemallae.backend.domain.stock.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Schema(description = "Signal filter counts")
public record StockListFilterCountsResponse(
    @Schema(description = "Number of buy candidates", example = "82")
    int buy,
    @Schema(description = "Number of sell candidates", example = "61")
    int sell,
    @Schema(description = "Number of hold candidates", example = "57")
    int hold
) {
}
