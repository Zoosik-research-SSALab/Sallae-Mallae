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
  private static final String ALL_KOREAN = "\uC804\uCCB4";

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

  static boolean matchesSector(StockTopListCandidate candidate, List<SectorFilter> sectors) {
    if (sectors == null || sectors.isEmpty()) {
      return true;
    }
    return sectors.contains(candidate.sectorFilter());
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

    if (sort == SortFilter.TRADING_VALUE) {
      return Comparator
          .comparing(StockTopListCandidate::tradingValue, Comparator.nullsLast(Comparator.reverseOrder()))
          .thenComparing(StockTopListCandidate::fluctuationMagnitude, Comparator.reverseOrder())
          .thenComparingInt(StockTopListCandidate::sourceRank);
    }

    if (sort == SortFilter.TRADING_VOLUME) {
      return Comparator
          .comparing(StockTopListCandidate::tradingVolume, Comparator.nullsLast(Comparator.reverseOrder()))
          .thenComparing(StockTopListCandidate::fluctuationMagnitude, Comparator.reverseOrder())
          .thenComparingInt(StockTopListCandidate::sourceRank);
    }

    if (sort == SortFilter.DIVIDEND_YIELD) {
      return Comparator
          .comparing(StockTopListCandidate::dividendYield, Comparator.nullsLast(Comparator.reverseOrder()))
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
        candidate.tradingValue(),
        candidate.tradingVolume(),
        candidate.dividendYield(),
        candidate.signal().name(),
        candidate.confidence(),
        candidate.isWatchlisted(),
        candidate.iconUrl()
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
      Long tradingValue,
      Long tradingVolume,
      Float dividendYield,
      SignalFilter signal,
      int confidence,
      boolean isWatchlisted,
      String iconUrl,
      Long marketCap,
      SectorFilter sectorFilter
  ) {

    float fluctuationMagnitude() {
      return fluctuationRate == null ? 0f : Math.abs(fluctuationRate);
    }
  }

  record StockTopListQuery(
      SignalFilter signal,
      List<SectorFilter> sectors,
      MarketCapFilter marketCap,
      SortFilter sort,
      String keyword,
      int offset,
      int limit
  ) {

    static StockTopListQuery of(
        String signal,
        List<String> sectors,
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

      List<SectorFilter> parsedSectors = sectors == null || sectors.isEmpty()
          ? List.of()
          : sectors.stream()
              .map(SectorFilter::from)
              .filter(f -> f != null)
              .toList();

      return new StockTopListQuery(
          SignalFilter.from(signal),
          parsedSectors,
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
    ENERGY("\uC5D0\uB108\uC9C0"),
    GREEN_CARBON("\uCE5C\uD658\uACBD / \uD0C4\uC18C"),
    MATERIALS("\uC18C\uC7AC"),
    SEMICONDUCTOR("\uBC18\uB3C4\uCCB4"),
    DISPLAY("\uB514\uC2A4\uD50C\uB808\uC774"),
    ELECTRONIC_COMPONENTS("\uC804\uC790\uBD80\uD488"),
    IT_PLATFORM_SOFTWARE("IT\uD50C\uB7AB\uD3FC / \uC18C\uD504\uD2B8\uC6E8\uC5B4"),
    GAME_DIGITAL_CONTENT("\uAC8C\uC784 / \uB514\uC9C0\uD138\uCF58\uD150\uCE20"),
    SECONDARY_BATTERY("2\uCC28\uC804\uC9C0"),
    SMART_DEVICES("\uC2A4\uB9C8\uD2B8\uAE30\uAE30"),
    MACHINERY_INDUSTRIAL_EQUIPMENT("\uAE30\uACC4 / \uC0B0\uC5C5\uC7A5\uBE44"),
    CONSTRUCTION_INFRA("\uAC74\uC124 / \uC778\uD504\uB77C"),
    SHIPBUILDING("\uC870\uC120"),
    DEFENSE("\uBC29\uC0B0"),
    TRANSPORT_LOGISTICS("\uC6B4\uC1A1 / \uBB3C\uB958"),
    CONSUMER_DURABLES("\uC18C\uBE44\uB0B4\uAD6C\uC7AC"),
    CONSUMER_STAPLES("\uD544\uC218\uC18C\uBE44\uC7AC"),
    FASHION_BEAUTY("\uD328\uC158 / \uBDF0\uD2F0"),
    RETAIL_SERVICES("\uC720\uD1B5 / \uC11C\uBE44\uC2A4"),
    FINANCE_HEALTHCARE("\uAE08\uC735 / \uD5EC\uC2A4\uCF00\uC5B4"),
    ETC("\uAE30\uD0C0");

    private final String category;

    SectorFilter(String category) {
      this.category = category;
    }

    String category() {
      return category;
    }

    static SectorFilter from(String value) {
      if (value == null || value.isBlank()) {
        return null;
      }

      String trimmed = value.trim();
      if (ALL_KOREAN.equals(trimmed) || "ALL".equalsIgnoreCase(trimmed)) {
        return null;
      }

      try {
        return SectorFilter.valueOf(trimmed.toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException e) {
        // 한글 category 값으로도 매칭 시도
        for (SectorFilter filter : values()) {
          if (filter.category.equals(trimmed)) {
            return filter;
          }
        }
        throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
      }
    }

    static SectorFilter fromCategory(String category) {
      if (category == null || category.isBlank()) {
        return null;
      }
      String trimmed = category.trim();
      for (SectorFilter filter : values()) {
        if (filter.category.equals(trimmed)) {
          return filter;
        }
      }
      return null;
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

      String trimmed = value.trim();
      if (ALL_KOREAN.equals(trimmed)) {
        return ALL;
      }

      try {
        return MarketCapFilter.valueOf(trimmed.toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException e) {
        throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
      }
    }
  }

  enum SortFilter {
    MARKET_CAP,
    CHANGE,
    TRADING_VALUE,
    TRADING_VOLUME,
    DIVIDEND_YIELD;

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
