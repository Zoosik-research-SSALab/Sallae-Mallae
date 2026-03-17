package com.sallaemallae.backend.domain.report.service;

import com.sallaemallae.backend.domain.report.exception.ReportErrorCode;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.util.Locale;

final class ChairmanPortfolioSupport {

  private static final int MAX_LIMIT = 50;

  private ChairmanPortfolioSupport() {
  }

  record PortfolioQuery(
      Tab tab,
      int offset,
      int limit
  ) {

    static PortfolioQuery of(String tab, int offset, int limit) {
      if (offset < 0 || limit < 1 || limit > MAX_LIMIT) {
        throw new BusinessException(ReportErrorCode.REPORT_INPUT_INVALID);
      }

      return new PortfolioQuery(
          Tab.from(tab),
          offset,
          limit
      );
    }
  }

  enum Tab {
    HOLDINGS,
    TODAY_TRADES,
    MONTHLY_RETURNS;

    static Tab from(String value) {
      if (value == null || value.isBlank()) {
        return HOLDINGS;
      }
      try {
        return Tab.valueOf(value.trim().toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException exception) {
        throw new BusinessException(ReportErrorCode.REPORT_INPUT_INVALID);
      }
    }
  }
}
