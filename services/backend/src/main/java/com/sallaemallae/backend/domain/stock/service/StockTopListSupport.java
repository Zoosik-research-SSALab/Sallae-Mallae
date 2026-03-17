package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockListFilterCountsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockListItemResponse;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

final class StockTopListSupport {

  private static final int DEFAULT_LIMIT = 6;
  private static final int MAX_LIMIT = 30;

  private StockTopListSupport() {
  }

  static SignalFilter resolveSignal(Float fluctuationRate) {
    if (fluctuationRate == null) {
      return SignalFilter.HOLD;
    }
    // TODO: Replace this temporary percentage heuristic with AI model-based signals.
    if (fluctuationRate >= 1.5f) {
      return SignalFilter.BUY;
    }
    if (fluctuationRate <= -1.5f) {
      return SignalFilter.SELL;
    }
    return SignalFilter.HOLD;
  }

  static int resolveConfidence(int sourceRank, Float fluctuationRate, SignalFilter signal) {
    float magnitude = fluctuationRate == null ? 0f : Math.min(Math.abs(fluctuationRate), 8f);
    int base = signal == SignalFilter.HOLD ? 52 : 58;
    int rankBoost = Math.max(0, 30 - Math.max(sourceRank, 1)) / 2;
    int magnitudeBoost = Math.round(magnitude * 4);
    return Math.max(50, Math.min(95, base + rankBoost + magnitudeBoost));
  }

  static boolean matchesKeyword(StockTopListCandidate candidate, String keyword) {
    if (keyword == null || keyword.isBlank()) {
      return true;
    }

    String normalizedKeyword = normalize(keyword);
    return normalize(candidate.ticker()).contains(normalizedKeyword)
        || normalize(candidate.name()).contains(normalizedKeyword)
        || normalize(candidate.gicsSector()).contains(normalizedKeyword);
  }

  static boolean matchesSector(StockTopListCandidate candidate, SectorFilter sector) {
    if (sector == null) {
      return true;
    }
    return sector == candidate.sectorFilter();
  }

  static boolean matchesMarketCap(StockTopListCandidate candidate, MarketCapFilter marketCap) {
    if (marketCap == MarketCapFilter.ALL) {
      return true;
    }
    if (candidate.marketCap() == null) {
      return false;
    }
    return marketCap.matches(candidate.marketCap());
  }

  static Comparator<StockTopListCandidate> comparator(SortFilter sort) {
    if (sort == SortFilter.MARKET_CAP) {
      return Comparator
          .comparing(StockTopListCandidate::marketCap, Comparator.nullsLast(Comparator.reverseOrder()))
          .thenComparing(StockTopListCandidate::fluctuationMagnitude, Comparator.reverseOrder())
          .thenComparingInt(StockTopListCandidate::sourceRank);
    }

    return Comparator
        .comparing(StockTopListCandidate::fluctuationMagnitude, Comparator.reverseOrder())
        .thenComparingInt(StockTopListCandidate::sourceRank);
  }

  static StockListFilterCountsResponse countSignals(List<StockTopListCandidate> candidates) {
    Map<SignalFilter, Integer> counts = new EnumMap<>(SignalFilter.class);
    for (SignalFilter signal : SignalFilter.values()) {
      counts.put(signal, 0);
    }
    for (StockTopListCandidate candidate : candidates) {
      counts.computeIfPresent(candidate.signal(), (key, value) -> value + 1);
    }
    return new StockListFilterCountsResponse(
        counts.get(SignalFilter.BUY),
        counts.get(SignalFilter.SELL),
        counts.get(SignalFilter.HOLD)
    );
  }

  static StockListItemResponse toResponse(StockTopListCandidate candidate, int displayRank) {
    return new StockListItemResponse(
        displayRank,
        candidate.stockId(),
        candidate.ticker(),
        candidate.name(),
        candidate.gicsSector(),
        candidate.price(),
        candidate.fluctuationRate(),
        candidate.signal().name(),
        candidate.confidence(),
        candidate.isWatchlisted()
    );
  }

  static String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  record StockTopListCandidate(
      int sourceRank,
      Long stockId,
      String ticker,
      String name,
      String gicsSector,
      Integer price,
      Float fluctuationRate,
      SignalFilter signal,
      int confidence,
      boolean isWatchlisted,
      Long marketCap,
      SectorFilter sectorFilter
  ) {

    float fluctuationMagnitude() {
      return fluctuationRate == null ? 0f : Math.abs(fluctuationRate);
    }
  }

  record StockTopListQuery(
      SignalFilter signal,
      SectorFilter sector,
      MarketCapFilter marketCap,
      SortFilter sort,
      String keyword,
      int offset,
      int limit
  ) {

    static StockTopListQuery of(
        String signal,
        String sector,
        String marketCap,
        String sort,
        String keyword,
        Integer offset,
        Integer limit
    ) {
      int normalizedOffset = offset == null ? 0 : offset;
      int normalizedLimit = limit == null ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
      if (normalizedOffset < 0 || normalizedLimit < 1) {
        throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
      }

      return new StockTopListQuery(
          SignalFilter.from(signal),
          SectorFilter.from(sector),
          MarketCapFilter.from(marketCap),
          SortFilter.from(sort),
          keyword == null ? null : keyword.trim(),
          normalizedOffset,
          normalizedLimit
      );
    }
  }

  enum SignalFilter {
    BUY,
    SELL,
    HOLD;

    static SignalFilter from(String value) {
      if (value == null || value.isBlank()) {
        return null;
      }
      try {
        return SignalFilter.valueOf(value.trim().toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException e) {
        throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
      }
    }
  }

  enum SectorFilter {
    IT("IT"),
    FINANCE("금융"),
    AUTO("자동차"),
    BIO("바이오"),
    BATTERY("2차전지");

    private final String label;

    SectorFilter(String label) {
      this.label = label;
    }

    String label() {
      return label;
    }

    static SectorFilter from(String value) {
      if (value == null || value.isBlank()) {
        return null;
      }
      return switch (value.trim()) {
        case "IT" -> IT;
        case "금융" -> FINANCE;
        case "자동차" -> AUTO;
        case "바이오" -> BIO;
        case "2차전지" -> BATTERY;
        default -> throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
      };
    }
  }

  enum MarketCapFilter {
    ALL,
    LARGE,
    MID;

    private static final long LARGE_CAP_THRESHOLD = 10_000_000_000_000L;
    private static final long MID_CAP_THRESHOLD = 2_000_000_000_000L;

    boolean matches(Long marketCap) {
      return switch (this) {
        case ALL -> true;
        case LARGE -> marketCap >= LARGE_CAP_THRESHOLD;
        case MID -> marketCap >= MID_CAP_THRESHOLD && marketCap < LARGE_CAP_THRESHOLD;
      };
    }

    static MarketCapFilter from(String value) {
      if (value == null || value.isBlank()) {
        return ALL;
      }
      try {
        return MarketCapFilter.valueOf(value.trim().toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException e) {
        throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
      }
    }
  }

  enum SortFilter {
    MARKET_CAP,
    CHANGE;

    static SortFilter from(String value) {
      if (value == null || value.isBlank()) {
        return CHANGE;
      }
      try {
        return SortFilter.valueOf(value.trim().toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException e) {
        throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
      }
    }
  }
}
