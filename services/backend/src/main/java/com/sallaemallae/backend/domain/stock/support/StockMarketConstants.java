package com.sallaemallae.backend.domain.stock.support;

import java.util.Set;

public final class StockMarketConstants {

  public static final String DOMESTIC_MARKET_CODE = "J";
  public static final String DEFAULT_PERIOD_CODE = "D";
  public static final Set<String> SUPPORTED_MARKET_CODES = Set.of(DOMESTIC_MARKET_CODE, "NX", "UN");
  public static final Set<String> SUPPORTED_REALTIME_MARKET_CODES = Set.of(DOMESTIC_MARKET_CODE);
  public static final Set<String> SUPPORTED_PERIOD_CODES = Set.of(DEFAULT_PERIOD_CODE, "W", "M", "Y");

  private StockMarketConstants() {
  }
}
