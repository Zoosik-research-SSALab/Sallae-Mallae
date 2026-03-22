package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.support.StockMarketConstants;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.stock.KisDomesticStockClient;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class StockQuoteRefreshScheduler {

  private static final long THROTTLE_MILLIS = 67L; // ~15 requests/sec
  private static final ZoneId KST = ZoneId.of("Asia/Seoul");

  // 프리마켓 (동시호가)
  private static final LocalTime PRE_MARKET_START = LocalTime.of(8, 30);

  // 정규장
  private static final LocalTime REGULAR_OPEN = LocalTime.of(9, 0);
  private static final LocalTime REGULAR_CLOSE = LocalTime.of(15, 30);

  // 장후 시간외 종가
  private static final LocalTime AFTER_CLOSE_START = LocalTime.of(15, 40);
  private static final LocalTime AFTER_CLOSE_END = LocalTime.of(16, 0);

  // 시간외 단일가 매매
  private static final LocalTime AFTER_SINGLE_START = LocalTime.of(16, 0);
  private static final LocalTime AFTER_SINGLE_END = LocalTime.of(18, 0);

  private final StockRepository stockRepository;
  private final KisDomesticStockClient kisDomesticStockClient;
  private final KisProperties kisProperties;
  private final StockQuoteCacheService stockQuoteCacheService;

  @Scheduled(fixedRate = 30_000, initialDelay = 25_000)
  public void refreshAllQuotes() {
    if (!kisProperties.isConfigured()) {
      log.debug("KIS API not configured. Skipping bulk quote refresh.");
      return;
    }
    if (!isTradingTime()) {
      return;
    }

    List<Stock> activeStocks = stockRepository.findAllByIsActiveTrueOrderByNameAsc();
    if (activeStocks.isEmpty()) {
      log.debug("No active stocks found. Skipping bulk quote refresh.");
      return;
    }

    String marketCode = StockMarketConstants.DOMESTIC_MARKET_CODE;
    int success = 0;
    int fail = 0;

    boolean overtime = isOvertimeSingleSession();

    for (Stock stock : activeStocks) {
      try {
        KisQuoteData quote = overtime
            ? kisDomesticStockClient.getOvertimeQuote(marketCode, stock.getTicker())
            : kisDomesticStockClient.getQuote(marketCode, stock.getTicker());
        stockQuoteCacheService.put(marketCode, stock.getTicker(), quote);
        success++;
      } catch (Exception e) {
        log.warn("Failed to fetch quote for ticker={}. error={}", stock.getTicker(), e.getMessage());
        fail++;
      }
      throttle();
    }

    log.info("Bulk quote refresh completed. total={}, success={}, fail={}, overtime={}", activeStocks.size(), success, fail, overtime);
  }

  /**
   * 시세 갱신이 의미 있는 시간대인지 확인.
   * - 프리마켓 (동시호가): 08:30 ~ 09:00
   * - 정규장: 09:00 ~ 15:30
   * - 장후 시간외 종가: 15:40 ~ 16:00
   * - 시간외 단일가: 16:00 ~ 18:00
   * - 주말 제외
   */
  private boolean isTradingTime() {
    ZonedDateTime now = ZonedDateTime.now(KST);
    DayOfWeek day = now.getDayOfWeek();
    if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
      return false;
    }

    LocalTime time = now.toLocalTime();
    return !time.isBefore(PRE_MARKET_START) && time.isBefore(AFTER_SINGLE_END);
  }

  private boolean isOvertimeSingleSession() {
    LocalTime time = ZonedDateTime.now(KST).toLocalTime();
    return !time.isBefore(AFTER_SINGLE_START) && time.isBefore(AFTER_SINGLE_END);
  }

  private void throttle() {
    try {
      Thread.sleep(THROTTLE_MILLIS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }
}
