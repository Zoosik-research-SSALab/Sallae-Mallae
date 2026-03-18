package com.sallaemallae.backend.infra.kis.stock;

import java.time.LocalDate;

public record KisDividendRateItem(
    Integer rank,
    String ticker,
    LocalDate recordDate,
    Float dividendYield,
    String dividendKind
) {
}
