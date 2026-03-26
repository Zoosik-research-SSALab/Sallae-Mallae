package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.entity.StockPriceMinute;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceMinuteRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockPriceDailyRecoveryService {

  private static final ZoneId KST = ZoneId.of("Asia/Seoul");
  private static final int RECOVERY_DAYS = 7;

  private final StockRepository stockRepository;
  private final StockPriceDailyRepository dailyRepository;
  private final StockPriceMinuteRepository minuteRepository;

  @EventListener(ApplicationReadyEvent.class)
  public void recoverOnStartup() {
    log.info("Daily candle recovery: checking for missing daily candles on startup...");
    int recovered = recover();
    if (recovered > 0) {
      log.info("Daily candle recovery: {} candles recovered from minute data", recovered);
    } else {
      log.info("Daily candle recovery: no missing candles found");
    }
  }

  @Scheduled(cron = "0 0 16,17 * * MON-FRI", zone = "Asia/Seoul")
  public void recoverScheduled() {
    log.info("Scheduled daily candle recovery started.");
    int recovered = recover();
    if (recovered > 0) {
      log.info("Scheduled daily candle recovery: {} candles recovered", recovered);
    }
  }

  private int recover() {
    List<Stock> activeStocks = stockRepository.findAllByIsActiveTrueOrderByNameAsc();
    if (activeStocks.isEmpty()) {
      return 0;
    }

    Set<Long> activeStockIds = activeStocks.stream()
        .map(Stock::getId)
        .collect(Collectors.toSet());

    LocalDate today = LocalDate.now(KST);
    List<LocalDate> targetDates = recentWeekdays(today, RECOVERY_DAYS);

    int totalRecovered = 0;
    for (LocalDate date : targetDates) {
      totalRecovered += recoverDate(activeStockIds, date);
    }
    return totalRecovered;
  }

  @Transactional
  protected int recoverDate(Set<Long> activeStockIds, LocalDate date) {
    OffsetDateTime dayStart = date.atStartOfDay(KST).toOffsetDateTime();
    OffsetDateTime dayEnd = date.plusDays(1).atStartOfDay(KST).toOffsetDateTime();

    List<StockPriceMinute> allMinutes = minuteRepository.findByDateRange(dayStart, dayEnd);
    if (allMinutes.isEmpty()) {
      return 0;
    }

    Map<Long, List<StockPriceMinute>> grouped = new LinkedHashMap<>();
    for (StockPriceMinute m : allMinutes) {
      if (activeStockIds.contains(m.getStockId())) {
        grouped.computeIfAbsent(m.getStockId(), k -> new ArrayList<>()).add(m);
      }
    }

    OffsetDateTime now = OffsetDateTime.now(KST);
    int saved = 0;

    for (var entry : grouped.entrySet()) {
      Long stockId = entry.getKey();
      List<StockPriceMinute> minutes = entry.getValue();

      if (dailyRepository.existsByStockIdAndTradeDate(stockId, date)) {
        continue;
      }

      minutes.sort(Comparator.comparing(StockPriceMinute::getTradeTimestamp));
      StockPriceMinute first = minutes.getFirst();
      StockPriceMinute last = minutes.getLast();

      Integer highPrice = minutes.stream()
          .map(StockPriceMinute::getHighPrice).filter(Objects::nonNull)
          .max(Integer::compareTo).orElse(null);
      Integer lowPrice = minutes.stream()
          .map(StockPriceMinute::getLowPrice).filter(Objects::nonNull)
          .min(Integer::compareTo).orElse(null);
      Long totalVolume = minutes.stream()
          .map(StockPriceMinute::getVolume).filter(Objects::nonNull)
          .mapToLong(Long::longValue).sum();
      Float fluctuationRate = computeFluctuationRate(first.getOpenPrice(), last.getClosePrice());

      dailyRepository.save(StockPriceDaily.builder()
          .stockId(stockId)
          .tradeDate(date)
          .openPrice(first.getOpenPrice())
          .highPrice(highPrice)
          .lowPrice(lowPrice)
          .closePrice(last.getClosePrice())
          .volume(totalVolume)
          .fluctuationRate(fluctuationRate)
          .createdAt(now)
          .build());
      saved++;
    }

    if (saved > 0) {
      log.info("Recovered daily candles for date={}. saved={}", date, saved);
    }
    return saved;
  }

  private Float computeFluctuationRate(Integer openPrice, Integer closePrice) {
    if (openPrice != null && openPrice != 0 && closePrice != null) {
      return ((closePrice - openPrice) * 100.0f) / openPrice;
    }
    return null;
  }

  private List<LocalDate> recentWeekdays(LocalDate today, int count) {
    List<LocalDate> dates = new ArrayList<>();
    LocalDate date = today.minusDays(1);
    while (dates.size() < count) {
      DayOfWeek dow = date.getDayOfWeek();
      if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
        dates.add(date);
      }
      date = date.minusDays(1);
    }
    return dates;
  }
}
