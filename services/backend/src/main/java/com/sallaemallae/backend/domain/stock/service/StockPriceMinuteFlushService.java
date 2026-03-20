package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceMinute;
import com.sallaemallae.backend.domain.stock.repository.StockPriceMinuteRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.support.StockMarketConstants;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeMinuteCandleAggregator;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeMinuteCandleData;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockPriceMinuteFlushService {

  private static final ZoneId KST = ZoneId.of("Asia/Seoul");
  private static final LocalTime REGULAR_OPEN = LocalTime.of(9, 0);
  private static final LocalTime REGULAR_CLOSE = LocalTime.of(15, 30);

  private final StockRepository stockRepository;
  private final StockPriceMinuteRepository stockPriceMinuteRepository;
  private final KisRealtimeMinuteCandleAggregator candleAggregator;
  private final KisProperties kisProperties;

  @Scheduled(fixedRate = 60_000, initialDelay = 40_000)
  @Transactional
  public void flushMinuteCandles() {
    if (!kisProperties.isConfigured() || !isRegularTradingTime()) {
      return;
    }

    List<Stock> activeStocks = stockRepository.findAllByIsActiveTrueOrderByNameAsc();
    String marketCode = StockMarketConstants.DOMESTIC_MARKET_CODE;
    int saved = 0;

    for (Stock stock : activeStocks) {
      List<KisRealtimeMinuteCandleData> closedCandles =
          candleAggregator.getRecentClosedMinuteCandles(marketCode, stock.getTicker(), 5);

      for (KisRealtimeMinuteCandleData candle : closedCandles) {
        if (!isRegularTradingCandle(candle.bucketStart())) {
          continue;
        }
        if (stockPriceMinuteRepository.existsByStockIdAndTradeTimestamp(
            stock.getId(), candle.bucketStart())) {
          continue;
        }

        StockPriceMinute entity = StockPriceMinute.builder()
            .stockId(stock.getId())
            .tradeTimestamp(candle.bucketStart())
            .openPrice(candle.openPrice())
            .highPrice(candle.highPrice())
            .lowPrice(candle.lowPrice())
            .closePrice(candle.closePrice())
            .volume(candle.minuteVolume())
            .createdAt(OffsetDateTime.now(KST))
            .build();

        stockPriceMinuteRepository.save(entity);
        saved++;
      }
    }

    if (saved > 0) {
      log.info("Minute candle flush completed. saved={}", saved);
    }
  }

  private boolean isRegularTradingTime() {
    ZonedDateTime now = ZonedDateTime.now(KST);
    DayOfWeek day = now.getDayOfWeek();
    if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
      return false;
    }
    LocalTime time = now.toLocalTime();
    return !time.isBefore(REGULAR_OPEN) && time.isBefore(REGULAR_CLOSE.plusMinutes(5));
  }

  private boolean isRegularTradingCandle(OffsetDateTime bucketStart) {
    LocalTime time = bucketStart.atZoneSameInstant(KST).toLocalTime();
    return !time.isBefore(REGULAR_OPEN) && time.isBefore(REGULAR_CLOSE);
  }
}
