package com.sallaemallae.backend.domain.signal.service;

import com.sallaemallae.backend.domain.signal.exception.SignalErrorCode;
import com.sallaemallae.backend.domain.signal.repository.SignalQueryRepository.SignalCandidateRow;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.util.Comparator;
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
      SignalSort sort,
      int offset,
      int limit
  ) {

    static SignalQuery of(String filter, String sort, int offset, int limit) {
      if (offset < 0 || limit < 1 || limit > MAX_LIMIT) {
        throw new BusinessException(SignalErrorCode.SIGNAL_INPUT_INVALID);
      }

      return new SignalQuery(
          SignalFilter.from(filter),
          SignalSort.from(sort),
          offset,
          limit
      );
    }
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
