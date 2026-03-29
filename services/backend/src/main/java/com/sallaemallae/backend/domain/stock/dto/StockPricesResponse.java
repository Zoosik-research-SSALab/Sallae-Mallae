package com.sallaemallae.backend.domain.stock.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Schema(description = "Stock price candle response with pagination")
public record StockPricesResponse(
    @Schema(description = "Candle type: MINUTE, DAILY, WEEKLY, MONTHLY, YEARLY")
    String candleType,
    @Schema(description = "Whether more data exists before the returned range")
    boolean hasMore,
    @Schema(description = "Cursor for next page (oldest timestamp in current result, ISO format)")
    String nextCursor,
    @Schema(description = "Price candle data points")
    List<StockPricePointResponse> prices
) {
}
