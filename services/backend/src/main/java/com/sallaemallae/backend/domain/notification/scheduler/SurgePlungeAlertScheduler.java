package com.sallaemallae.backend.domain.notification.scheduler;

import com.sallaemallae.backend.domain.notification.enumtype.NotifyType;
import com.sallaemallae.backend.domain.notification.service.NotificationPublishService;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.service.StockQuoteCacheService;
import com.sallaemallae.backend.domain.stock.support.StockMarketConstants;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SurgePlungeAlertScheduler {

  private static final double THRESHOLD_RATE = 0.05; // ±5%
  private static final long COOLDOWN_MILLIS = 60 * 60 * 1000L; // 1시간
  private static final ZoneId KST = ZoneId.of("Asia/Seoul");

  private final StockQuoteCacheService stockQuoteCacheService;
  private final StockRepository stockRepository;
  private final StockPriceDailyRepository dailyRepository;
  private final NotificationPublishService notificationPublishService;

  // 종목별 마지막 알림 기준 가격 (서버 재시작 시 전일종가 폴백)
  private final ConcurrentHashMap<Long, Integer> lastAlertPriceMap = new ConcurrentHashMap<>();
  // 종목별 마지막 알림 시각 (쿨다운용)
  private final ConcurrentHashMap<Long, Long> lastAlertTimeMap = new ConcurrentHashMap<>();

  @Scheduled(fixedRate = 30_000, initialDelay = 30_000)
  public void checkSurgePlunge() {
    if (!isRegularTradingTime()) {
      return;
    }

    List<Stock> stocks = stockRepository.findAllByIsActiveTrueOrderByNameAsc();
    String marketCode = StockMarketConstants.DOMESTIC_MARKET_CODE;

    Map<String, KisQuoteData> quotes = stockQuoteCacheService.getAll(
        marketCode,
        stocks.stream().map(Stock::getTicker).toList()
    );

    for (Stock stock : stocks) {
      KisQuoteData quote = quotes.get(stock.getTicker());
      if (quote == null || quote.currentPrice() == null) {
        continue;
      }

      int currentPrice = quote.currentPrice();
      int basePrice = getBasePrice(stock, quote);
      if (basePrice <= 0) {
        continue;
      }

      double changeRate = (double) (currentPrice - basePrice) / basePrice;

      if (Math.abs(changeRate) >= THRESHOLD_RATE && !isInCooldown(stock.getId())) {
        String direction = changeRate > 0 ? "급등" : "급락";
        String changePercent = String.format("%+.1f%%", changeRate * 100);

        notificationPublishService.publish(
            stock.getId(),
            NotifyType.SURGE_PLUNGE,
            stock.getName() + " " + direction + " 알림",
            stock.getName() + "이(가) " + changePercent + " 변동했습니다. "
                + "현재가: " + String.format("%,d", currentPrice) + "원",
            null
        );

        lastAlertPriceMap.put(stock.getId(), currentPrice);
        lastAlertTimeMap.put(stock.getId(), Instant.now().toEpochMilli());
        log.info("급등락 알림: stock={}, change={}", stock.getTicker(), changePercent);
      }
    }
  }

  /** 장 시작 시 기준가격 초기화 */
  @Scheduled(cron = "0 0 9 * * MON-FRI", zone = "Asia/Seoul")
  public void resetDailyAlertPrices() {
    lastAlertPriceMap.clear();
    lastAlertTimeMap.clear();
    log.info("급등락 알림 기준가격 초기화");
  }

  private boolean isInCooldown(Long stockId) {
    Long lastTime = lastAlertTimeMap.get(stockId);
    return lastTime != null && (Instant.now().toEpochMilli() - lastTime) < COOLDOWN_MILLIS;
  }

  private int getBasePrice(Stock stock, KisQuoteData quote) {
    Integer lastAlertPrice = lastAlertPriceMap.get(stock.getId());
    if (lastAlertPrice != null) {
      return lastAlertPrice;
    }

    return dailyRepository.findTopByStockIdOrderByTradeDateDescIdDesc(stock.getId())
        .map(StockPriceDaily::getClosePrice)
        .orElseGet(() ->
            quote.previousClosePrice() != null ? quote.previousClosePrice() : 0
        );
  }

  private boolean isRegularTradingTime() {
    ZonedDateTime now = ZonedDateTime.now(KST);
    DayOfWeek day = now.getDayOfWeek();
    if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
      return false;
    }
    LocalTime time = now.toLocalTime();
    return !time.isBefore(LocalTime.of(9, 0)) && time.isBefore(LocalTime.of(15, 30));
  }
}
