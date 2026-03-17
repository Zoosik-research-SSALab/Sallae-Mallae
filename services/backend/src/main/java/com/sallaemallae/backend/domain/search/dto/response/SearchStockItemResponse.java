package com.sallaemallae.backend.domain.search.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record SearchStockItemResponse(
    Long id,
    String ticker,
    String name,
    @JsonProperty("gics_sector") String gicsSector,
    @JsonProperty("current_price") Integer currentPrice,
    @JsonProperty("fluctuation_rate") BigDecimal fluctuationRate
) {
}
