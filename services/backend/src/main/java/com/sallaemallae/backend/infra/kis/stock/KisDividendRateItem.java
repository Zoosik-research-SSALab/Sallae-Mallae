package com.sallaemallae.backend.infra.kis.stock;

import java.time.LocalDate;

public record KisDividendRateItem(
    Integer rank,
    String ticker,
    LocalDate recordDate,
    Float dividendYield,
    String dividendKind,
    DividendType dividendType
) {

  public boolean isCashDividend() {
    return dividendType == DividendType.CASH;
  }

  public boolean isStockDividend() {
    return dividendType == DividendType.STOCK;
  }

  public enum DividendType {
    CASH,
    STOCK
  }
}
