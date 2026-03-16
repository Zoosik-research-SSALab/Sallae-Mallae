package com.sallaemallae.backend.domain.stock.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Schema(description = "Stock basic info response")
public record StockBasicInfoResponse(
    @Schema(description = "Stock ID", example = "1")
    Long id,
    @Schema(description = "Stock ticker", example = "005930")
    String ticker,
    @Schema(description = "Stock name", example = "Samsung Electronics")
    String name,
    @Schema(description = "Market type", example = "KOSPI")
    String marketType,
    @Schema(description = "GICS sector", example = "Information Technology")
    String gicsSector,
    @Schema(description = "Stock category", example = "Semiconductor")
    String category,
    @Schema(description = "Response base time")
    OffsetDateTime baseTime
) {
}
