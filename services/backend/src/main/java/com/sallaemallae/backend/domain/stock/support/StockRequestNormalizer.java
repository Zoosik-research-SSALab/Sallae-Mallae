package com.sallaemallae.backend.domain.stock.support;

import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.global.exception.ErrorCode;

public final class StockRequestNormalizer {

  private static final String TICKER_PATTERN = "^[0-9A-Z]{6}$";

  private StockRequestNormalizer() {
  }

  public static String normalizeTicker(String ticker, ErrorCode errorCode) {
    if (ticker == null) {
      throw new BusinessException(errorCode);
    }

    String normalized = ticker.trim().toUpperCase();
    if (!normalized.matches(TICKER_PATTERN)) {
      throw new BusinessException(errorCode);
    }
    return normalized;
  }

  public static String normalizeMarket(String marketCode, ErrorCode errorCode) {
    if (marketCode == null || marketCode.isBlank()) {
      return StockMarketConstants.DOMESTIC_MARKET_CODE;
    }

    String normalized = marketCode.trim().toUpperCase();
    if (!StockMarketConstants.SUPPORTED_MARKET_CODES.contains(normalized)) {
      throw new BusinessException(errorCode);
    }
    return normalized;
  }

  public static String normalizeRealtimeMarket(String marketCode, ErrorCode errorCode) {
    if (marketCode == null || marketCode.isBlank()) {
      return StockMarketConstants.DOMESTIC_MARKET_CODE;
    }

    String normalized = marketCode.trim().toUpperCase();
    if (!StockMarketConstants.SUPPORTED_REALTIME_MARKET_CODES.contains(normalized)) {
      throw new BusinessException(errorCode);
    }
    return normalized;
  }

  public static String normalizePeriod(String periodCode, ErrorCode errorCode) {
    if (periodCode == null || periodCode.isBlank()) {
      return StockMarketConstants.DEFAULT_PERIOD_CODE;
    }

    String normalized = periodCode.trim().toUpperCase();
    if (!StockMarketConstants.SUPPORTED_PERIOD_CODES.contains(normalized)) {
      throw new BusinessException(errorCode);
    }
    return normalized;
  }
}
