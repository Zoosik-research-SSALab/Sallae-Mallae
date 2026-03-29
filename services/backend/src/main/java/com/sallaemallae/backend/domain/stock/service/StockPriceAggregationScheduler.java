package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.entity.StockPriceMonthly;
import com.sallaemallae.backend.domain.stock.entity.StockPriceWeekly;
import com.sallaemallae.backend.domain.stock.entity.StockPriceYearly;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceMonthlyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceWeeklyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceYearlyRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockPriceAggregationScheduler {

  private static final ZoneId KST = ZoneId.of("Asia/Seoul");

  private final StockPriceDailyRepository dailyRepository;
  private final StockPriceWeeklyRepository weeklyRepository;
  private final StockPriceMonthlyRepository monthlyRepository;
  private final StockPriceYearlyRepository yearlyRepository;

  // 매주 금요일 15:40 — 일봉 적재(15:35) 이후 이번 주 일봉을 주봉으로 집계
  @Scheduled(cron = "0 40 15 * * FRI", zone = "Asia/Seoul")
  @Transactional
  public void aggregateWeekly() {
    LocalDate today = LocalDate.now(KST);
    LocalDate weekStart = today.with(DayOfWeek.MONDAY);
    LocalDate weekEnd = today;

    List<StockPriceDaily> dailyData = dailyRepository
        .findByTradeDateBetweenOrderByStockIdAscTradeDateAsc(weekStart, weekEnd);

    Map<Long, List<StockPriceDaily>> grouped = groupByStockId(dailyData);
    OffsetDateTime now = OffsetDateTime.now(KST);
    int saved = 0;

    for (var entry : grouped.entrySet()) {
      Long stockId = entry.getKey();
      List<StockPriceDaily> candles = entry.getValue();
      if (candles.isEmpty()) {
        continue;
      }
      if (weeklyRepository.existsByStockIdAndTradeWeek(stockId, weekStart)) {
        continue;
      }

      StockPriceDaily first = candles.getFirst();
      StockPriceDaily last = candles.getLast();

      weeklyRepository.save(StockPriceWeekly.builder()
          .stockId(stockId)
          .tradeWeek(weekStart)
          .openPrice(first.getOpenPrice())
          .highPrice(candles.stream().map(StockPriceDaily::getHighPrice).filter(p -> p != null).max(Integer::compareTo).orElse(null))
          .lowPrice(candles.stream().map(StockPriceDaily::getLowPrice).filter(p -> p != null).min(Integer::compareTo).orElse(null))
          .closePrice(last.getClosePrice())
          .volume(candles.stream().map(StockPriceDaily::getVolume).filter(v -> v != null).mapToLong(Long::longValue).sum())
          .fluctuationRate(computeFluctuationRate(first, last))
          .createdAt(now)
          .build());
      saved++;
    }

    log.info("Weekly aggregation completed. weekStart={}, saved={}", weekStart, saved);
  }

  // 매월 1일 01:00 — 전월 일봉을 월봉으로 집계
  @Scheduled(cron = "0 0 1 1 * *", zone = "Asia/Seoul")
  @Transactional
  public void aggregateMonthly() {
    LocalDate today = LocalDate.now(KST);
    LocalDate prevMonthStart = today.minusMonths(1).withDayOfMonth(1);
    LocalDate prevMonthEnd = today.minusDays(1);

    List<StockPriceDaily> dailyData = dailyRepository
        .findByTradeDateBetweenOrderByStockIdAscTradeDateAsc(prevMonthStart, prevMonthEnd);

    Map<Long, List<StockPriceDaily>> grouped = groupByStockId(dailyData);
    OffsetDateTime now = OffsetDateTime.now(KST);
    int saved = 0;

    for (var entry : grouped.entrySet()) {
      Long stockId = entry.getKey();
      List<StockPriceDaily> candles = entry.getValue();
      if (candles.isEmpty()) {
        continue;
      }
      if (monthlyRepository.existsByStockIdAndTradeMonth(stockId, prevMonthStart)) {
        continue;
      }

      StockPriceDaily first = candles.getFirst();
      StockPriceDaily last = candles.getLast();

      monthlyRepository.save(StockPriceMonthly.builder()
          .stockId(stockId)
          .tradeMonth(prevMonthStart)
          .openPrice(first.getOpenPrice())
          .highPrice(candles.stream().map(StockPriceDaily::getHighPrice).filter(p -> p != null).max(Integer::compareTo).orElse(null))
          .lowPrice(candles.stream().map(StockPriceDaily::getLowPrice).filter(p -> p != null).min(Integer::compareTo).orElse(null))
          .closePrice(last.getClosePrice())
          .volume(candles.stream().map(StockPriceDaily::getVolume).filter(v -> v != null).mapToLong(Long::longValue).sum())
          .fluctuationRate(computeFluctuationRate(first, last))
          .createdAt(now)
          .build());
      saved++;
    }

    log.info("Monthly aggregation completed. month={}, saved={}", prevMonthStart, saved);
  }

  // 매년 1월 1일 02:00 — 전년 일봉을 년봉으로 집계
  @Scheduled(cron = "0 0 2 1 1 *", zone = "Asia/Seoul")
  @Transactional
  public void aggregateYearly() {
    LocalDate today = LocalDate.now(KST);
    int prevYear = today.getYear() - 1;
    LocalDate yearStart = LocalDate.of(prevYear, 1, 1);
    LocalDate yearEnd = LocalDate.of(prevYear, 12, 31);

    List<StockPriceDaily> dailyData = dailyRepository
        .findByTradeDateBetweenOrderByStockIdAscTradeDateAsc(yearStart, yearEnd);

    Map<Long, List<StockPriceDaily>> grouped = groupByStockId(dailyData);
    OffsetDateTime now = OffsetDateTime.now(KST);
    int saved = 0;

    for (var entry : grouped.entrySet()) {
      Long stockId = entry.getKey();
      List<StockPriceDaily> candles = entry.getValue();
      if (candles.isEmpty()) {
        continue;
      }
      if (yearlyRepository.existsByStockIdAndTradeYear(stockId, prevYear)) {
        continue;
      }

      StockPriceDaily first = candles.getFirst();
      StockPriceDaily last = candles.getLast();

      yearlyRepository.save(StockPriceYearly.builder()
          .stockId(stockId)
          .tradeYear(prevYear)
          .openPrice(first.getOpenPrice())
          .highPrice(candles.stream().map(StockPriceDaily::getHighPrice).filter(p -> p != null).max(Integer::compareTo).orElse(null))
          .lowPrice(candles.stream().map(StockPriceDaily::getLowPrice).filter(p -> p != null).min(Integer::compareTo).orElse(null))
          .closePrice(last.getClosePrice())
          .volume(candles.stream().map(StockPriceDaily::getVolume).filter(v -> v != null).mapToLong(Long::longValue).sum())
          .fluctuationRate(computeFluctuationRate(first, last))
          .createdAt(now)
          .build());
      saved++;
    }

    log.info("Yearly aggregation completed. year={}, saved={}", prevYear, saved);
  }

  private Map<Long, List<StockPriceDaily>> groupByStockId(List<StockPriceDaily> dailyData) {
    Map<Long, List<StockPriceDaily>> grouped = new LinkedHashMap<>();
    for (StockPriceDaily d : dailyData) {
      grouped.computeIfAbsent(d.getStockId(), k -> new ArrayList<>()).add(d);
    }
    return grouped;
  }

  private Float computeFluctuationRate(StockPriceDaily first, StockPriceDaily last) {
    if (first.getOpenPrice() != null && first.getOpenPrice() != 0 && last.getClosePrice() != null) {
      return ((last.getClosePrice() - first.getOpenPrice()) * 100.0f) / first.getOpenPrice();
    }
    return null;
  }
}
