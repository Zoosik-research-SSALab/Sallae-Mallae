package com.sallaemallae.backend.infra.kis.stock;

import java.time.OffsetDateTime;
import java.util.List;

public record KisMinuteCandleData(
    String marketCode,
    String ticker,
    String name,
    Integer currentPrice,
    Integer previousClosePrice,
    Integer changePrice,
    Float changeRate,
    OffsetDateTime asOf,
    List<KisMinuteCandleItem> candles,
    String source
) {
}
