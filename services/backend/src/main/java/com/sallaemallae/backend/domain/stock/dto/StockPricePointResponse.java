package com.sallaemallae.backend.domain.stock.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(description = "Stock price point")
public record StockPricePointResponse(
    @Schema(description = "Candle timestamp")
    OffsetDateTime timestamp,
    @Schema(description = "Open price", example = "70000")
    Integer open,
    @Schema(description = "High price", example = "70500")
    Integer high,
    @Schema(description = "Low price", example = "69800")
    Integer low,
    @Schema(description = "Close price", example = "70300")
    Integer close,
    @Schema(description = "Volume", example = "123456")
    Long volume
) {
}
