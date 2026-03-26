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
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class StockPriceDailyRecoveryService {

  private static final ZoneId KST = ZoneId.of("Asia/Seoul");
  private static final int RECOVERY_DAYS = 7;

  private final StockRepository stockRepository;
  private final StockPriceDailyRepository dailyRepository;
  private final StockPriceMinuteRepository minuteRepository;
  private final StockPriceDailyRecoveryService self;

  public StockPriceDailyRecoveryService(
      StockRepository stockRepository,
      StockPriceDailyRepository dailyRepository,
      StockPriceMinuteRepository minuteRepository,
      @Lazy StockPriceDailyRecoveryService self
  ) {
    this.stockRepository = stockRepository;
    this.dailyRepository = dailyRepository;
    this.minuteRepository = minuteRepository;
    this.self = self;
  }

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
      totalRecovered += self.recoverDate(activeStockIds, date);
    }
    return totalRecovered;
  }

  @Transactional
  public int recoverDate(Set<Long> activeStockIds, LocalDate date) {
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

    // 전일 종가 조회 (등락률 계산용)
    LocalDate prevDate = findPreviousWeekday(date);
    Map<Long, Integer> prevCloseMap = buildPrevCloseMap(activeStockIds, prevDate);

    OffsetDateTime now = OffsetDateTime.now(KST);
    List<StockPriceDaily> toSave = new ArrayList<>();

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

      Integer prevClose = prevCloseMap.get(stockId);
      Float fluctuationRate = computeFluctuationRate(prevClose, last.getClosePrice());

      toSave.add(StockPriceDaily.builder()
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
    }

    if (!toSave.isEmpty()) {
      dailyRepository.saveAll(toSave);
      log.info("Recovered daily candles for date={}. saved={}", date, toSave.size());
    }
    return toSave.size();
  }

  /** 전일 종가 대비 등락률: (당일 종가 - 전일 종가) / 전일 종가 * 100 */
  private Float computeFluctuationRate(Integer prevClose, Integer closePrice) {
    if (prevClose != null && prevClose != 0 && closePrice != null) {
      return ((closePrice - prevClose) * 100.0f) / prevClose;
    }
    return null;
  }

  /** 활성 종목들의 특정 날짜 종가 Map 조회 */
  private Map<Long, Integer> buildPrevCloseMap(Set<Long> stockIds, LocalDate prevDate) {
    Map<Long, Integer> map = new LinkedHashMap<>();
    for (Long stockId : stockIds) {
      dailyRepository.findTopByStockIdAndTradeDateLessThanEqualOrderByTradeDateDesc(stockId, prevDate)
          .ifPresent(d -> map.put(stockId, d.getClosePrice()));
    }
    return map;
  }

  private LocalDate findPreviousWeekday(LocalDate date) {
    LocalDate prev = date.minusDays(1);
    while (prev.getDayOfWeek() == DayOfWeek.SATURDAY || prev.getDayOfWeek() == DayOfWeek.SUNDAY) {
      prev = prev.minusDays(1);
    }
    return prev;
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
