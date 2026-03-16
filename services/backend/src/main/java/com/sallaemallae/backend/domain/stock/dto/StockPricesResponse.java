package com.sallaemallae.backend.domain.stock.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "Stock price chart response")
public record StockPricesResponse(
    @Schema(description = "Price points")
    List<StockPricePointResponse> prices
) {
}
