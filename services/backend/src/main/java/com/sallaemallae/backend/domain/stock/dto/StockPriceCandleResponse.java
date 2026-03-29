package com.sallaemallae.backend.domain.stock.dto;

import java.time.LocalDate;

public record StockPriceCandleResponse(
    LocalDate tradeDate,
    Integer openPrice,
    Integer highPrice,
    Integer lowPrice,
    Integer closePrice,
    Long volume,
    Integer changePrice,
    Float fluctuationRate,
    boolean modified
) {
}
