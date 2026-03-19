package com.sallaemallae.backend.infra.kis.stock;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record KisDividendRateData(
    String marketGroup,
    String upjong,
    LocalDate fromDate,
    LocalDate toDate,
    OffsetDateTime queriedAt,
    List<KisDividendRateItem> items,
    String source
) {
}
