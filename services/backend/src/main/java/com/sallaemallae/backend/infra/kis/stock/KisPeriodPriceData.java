package com.sallaemallae.backend.infra.kis.stock;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record KisPeriodPriceData(
    String marketCode,
    String ticker,
    String name,
    String periodCode,
    LocalDate startDate,
    LocalDate endDate,
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
    List<KisPriceCandleData> candles,
    String source
) {
}
