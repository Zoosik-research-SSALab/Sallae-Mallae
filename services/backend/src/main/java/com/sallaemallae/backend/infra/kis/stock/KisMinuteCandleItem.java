package com.sallaemallae.backend.infra.kis.stock;

import java.time.OffsetDateTime;

public record KisMinuteCandleItem(
    OffsetDateTime timestamp,
    Integer openPrice,
    Integer highPrice,
    Integer lowPrice,
    Integer closePrice,
    Long volume
) {
}
