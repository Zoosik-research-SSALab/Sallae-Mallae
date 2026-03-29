package com.sallaemallae.backend.domain.stock.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record StockPeriodPriceResponse(
    String ticker,
    String name,
    String market,
    String period,
    String startDate,
    String endDate,
    boolean adjusted,
    Integer currentPrice,
    Integer previousClosePrice,
    Integer changePrice,
    Float changeRate,
    Integer openPrice,
    Integer highPrice,
    Integer lowPrice,
    Long volume,
    OffsetDateTime asOf,
    List<StockPriceCandleResponse> candles,
    boolean cacheHit,
    String cacheKey,
    String source
) {
}
