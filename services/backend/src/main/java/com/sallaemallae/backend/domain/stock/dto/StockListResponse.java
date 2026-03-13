package com.sallaemallae.backend.domain.stock.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Schema(description = "Top stock list response")
public record StockListResponse(
    @Schema(description = "Counts for each signal filter in the current filtered result set")
    StockListFilterCountsResponse filterCounts,
    @Schema(description = "Paginated stock items")
    List<StockListItemResponse> stocks
) {
}
