package com.sallaemallae.backend.domain.signal.service;

import com.sallaemallae.backend.domain.signal.exception.SignalErrorCode;
import com.sallaemallae.backend.domain.signal.repository.SignalQueryRepository.SignalCandidateRow;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

final class SignalSupport {

  private static final int MAX_LIMIT = 50;

  private SignalSupport() {
  }

  static Comparator<SignalCandidateRow> comparator(SignalSort sort) {
    return switch (sort) {
      case UP -> Comparator
          .comparing(SignalCandidateRow::fluctuationRate, Comparator.nullsLast(Comparator.reverseOrder()))
          .thenComparing(SignalCandidateRow::createdAt, Comparator.nullsLast(Comparator.reverseOrder()));
      case DOWN -> Comparator
          .comparing(SignalCandidateRow::fluctuationRate, Comparator.nullsLast(Comparator.naturalOrder()))
          .thenComparing(SignalCandidateRow::createdAt, Comparator.nullsLast(Comparator.reverseOrder()));
      case LATEST -> Comparator
          .comparing(SignalCandidateRow::createdAt, Comparator.nullsLast(Comparator.reverseOrder()))
          .thenComparing(SignalCandidateRow::confidence, Comparator.nullsLast(Comparator.reverseOrder()));
    };
  }

  static int toPercentInt(Float confidence) {
    if (confidence == null) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(confidence * 100)));
  }

  record SignalQuery(
      SignalFilter filter,
      List<String> categories,
      String keyword,
      MarketCapFilter marketCapFilter,
      SignalSort sort,
      int offset,
      int limit
  ) {

    static SignalQuery of(String filter, String categories, String keyword, String marketCap, String sort, int offset, int limit) {
      if (offset < 0 || limit < 1 || limit > MAX_LIMIT) {
        throw new BusinessException(SignalErrorCode.SIGNAL_INPUT_INVALID);
      }

      return new SignalQuery(
          SignalFilter.from(filter),
          parseCategories(categories),
          normalize(keyword),
          MarketCapFilter.from(marketCap),
          SignalSort.from(sort),
          offset,
          limit
      );
    }

    boolean matchesCategory(String category) {
      return categories.isEmpty() || categories.contains(normalize(category));
    }

    boolean matchesKeyword(String name, String ticker) {
      if (keyword.isEmpty()) {
        return true;
      }
      return normalize(name).contains(keyword) || normalize(ticker).contains(keyword);
    }
  }

  private static List<String> parseCategories(String categories) {
    if (categories == null || categories.isBlank()) {
      return List.of();
    }
    return List.of(categories.split(",")).stream()
        .map(String::trim)
        .filter(value -> !value.isEmpty())
        .map(SignalSupport::normalize)
        .toList();
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  enum SignalFilter {
    ALL,
    BUY,
    SELL;

    static SignalFilter from(String value) {
      if (value == null || value.isBlank()) {
        return ALL;
      }
      try {
        return SignalFilter.valueOf(value.trim().toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException exception) {
        throw new BusinessException(SignalErrorCode.SIGNAL_INPUT_INVALID);
      }
    }

    boolean matches(String signal) {
      return this == ALL || name().equals(signal);
    }
  }

  enum MarketCapFilter {
    ALL,
    SMALL,
    MID,
    LARGE;

    private static final long ONE_TRILLION = 1_000_000_000_000L;
    private static final long TEN_TRILLION = 10_000_000_000_000L;

    static MarketCapFilter from(String value) {
      if (value == null || value.isBlank()) {
        return ALL;
      }
      try {
        return MarketCapFilter.valueOf(value.trim().toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException exception) {
        throw new BusinessException(SignalErrorCode.SIGNAL_INPUT_INVALID);
      }
    }

    boolean matches(Long marketCap) {
      if (this == ALL) {
        return true;
      }
      if (marketCap == null) {
        return false;
      }
      return switch (this) {
        case SMALL -> marketCap < ONE_TRILLION;
        case MID -> marketCap >= ONE_TRILLION && marketCap < TEN_TRILLION;
        case LARGE -> marketCap >= TEN_TRILLION;
        case ALL -> true;
      };
    }
  }

  enum SignalSort {
    LATEST,
    UP,
    DOWN;

    static SignalSort from(String value) {
      if (value == null || value.isBlank()) {
        return LATEST;
      }
      try {
        return SignalSort.valueOf(value.trim().toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException exception) {
        throw new BusinessException(SignalErrorCode.SIGNAL_INPUT_INVALID);
      }
    }
  }
}
