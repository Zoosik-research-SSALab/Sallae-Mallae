package com.sallaemallae.backend.infra.kis.stock;

import java.time.OffsetDateTime;
import java.util.List;

public record KisTopInterestStockData(
    String marketCode,
    OffsetDateTime requestedAt,
    List<KisTopInterestStockItem> items,
    String source
) {
}
