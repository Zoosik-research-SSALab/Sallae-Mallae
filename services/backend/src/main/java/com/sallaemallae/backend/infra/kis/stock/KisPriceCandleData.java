package com.sallaemallae.backend.infra.kis.stock;

import java.time.LocalDate;

public record KisPriceCandleData(
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
