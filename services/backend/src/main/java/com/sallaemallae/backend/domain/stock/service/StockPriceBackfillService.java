package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.entity.StockPriceMonthly;
import com.sallaemallae.backend.domain.stock.entity.StockPriceWeekly;
import com.sallaemallae.backend.domain.stock.entity.StockPriceYearly;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceMonthlyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceWeeklyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceYearlyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.support.StockMarketConstants;
import com.sallaemallae.backend.infra.kis.stock.KisDomesticStockClient;
import com.sallaemallae.backend.infra.kis.stock.KisPeriodPriceData;
import com.sallaemallae.backend.infra.kis.stock.KisPriceCandleData;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockPriceBackfillService {

  private static final ZoneId KST = ZoneId.of("Asia/Seoul");
  private static final LocalDate BACKFILL_START = LocalDate.of(2000, 1, 1);
  private static final long THROTTLE_MILLIS = 67L;

  private final StockRepository stockRepository;
  private final KisDomesticStockClient kisDomesticStockClient;
  private final StockPriceDailyRepository dailyRepository;
  private final StockPriceWeeklyRepository weeklyRepository;
  private final StockPriceMonthlyRepository monthlyRepository;
  private final StockPriceYearlyRepository yearlyRepository;

  @Async
  public void backfillStock(String ticker, String periodCode, LocalDate from) {
    Stock stock = stockRepository.findByTickerAndIsActiveTrue(ticker)
        .orElseThrow(() -> new IllegalArgumentException("Stock not found: " + ticker));

    String marketCode = StockMarketConstants.DOMESTIC_MARKET_CODE;
    LocalDate end = LocalDate.now(KST);

    int chunkDays = switch (periodCode) {
      case "D" -> 100;
      case "W" -> 700;
      case "M" -> 3000;
      case "Y" -> 10000;
      default -> throw new IllegalArgumentException("Invalid periodCode: " + periodCode);
    };

    int totalSaved = 0;
    LocalDate chunkStart = (from != null) ? from : resolveStartDate(stock.getId(), periodCode);

    while (chunkStart.isBefore(end)) {
      LocalDate chunkEnd = chunkStart.plusDays(chunkDays);
      if (chunkEnd.isAfter(end)) {
        chunkEnd = end;
      }

      try {
        KisPeriodPriceData data = kisDomesticStockClient.getPeriodPrices(
            marketCode, ticker, periodCode, chunkStart, chunkEnd, true
        );
        int saved = saveCandles(stock.getId(), periodCode, data.candles());
        totalSaved += saved;
      } catch (Exception e) {
        log.warn("Backfill failed. ticker={}, period={}, chunk={}-{}. error={}",
            ticker, periodCode, chunkStart, chunkEnd, e.getMessage());
      }

      throttle();
      chunkStart = chunkEnd.plusDays(1);
    }

    log.info("Backfill completed. ticker={}, period={}, totalSaved={}", ticker, periodCode, totalSaved);
  }

  @Async
  public void backfillAll(String periodCode, LocalDate from) {
    List<Stock> stocks = stockRepository.findAllByIsActiveTrueOrderByNameAsc();
    log.info("Starting full backfill. period={}, from={}, stockCount={}", periodCode, from, stocks.size());

    for (Stock stock : stocks) {
      backfillStock(stock.getTicker(), periodCode, from);
    }
  }

  @Transactional
  protected int saveCandles(Long stockId, String periodCode, List<KisPriceCandleData> candles) {
    int saved = 0;
    OffsetDateTime now = OffsetDateTime.now(KST);

    for (KisPriceCandleData candle : candles) {
      if (candle.closePrice() == null) {
        continue;
      }
      try {
        switch (periodCode) {
          case "D" -> {
            dailyRepository.save(StockPriceDaily.builder()
                .stockId(stockId)
                .tradeDate(candle.tradeDate())
                .openPrice(candle.openPrice())
                .highPrice(candle.highPrice())
                .lowPrice(candle.lowPrice())
                .closePrice(candle.closePrice())
                .volume(candle.volume())
                .fluctuationRate(candle.fluctuationRate())
                .createdAt(now)
                .build());
          }
          case "W" -> {
            weeklyRepository.save(StockPriceWeekly.builder()
                .stockId(stockId)
                .tradeWeek(candle.tradeDate())
                .openPrice(candle.openPrice())
                .highPrice(candle.highPrice())
                .lowPrice(candle.lowPrice())
                .closePrice(candle.closePrice())
                .volume(candle.volume())
                .fluctuationRate(candle.fluctuationRate())
                .createdAt(now)
                .build());
          }
          case "M" -> {
            monthlyRepository.save(StockPriceMonthly.builder()
                .stockId(stockId)
                .tradeMonth(candle.tradeDate().withDayOfMonth(1))
                .openPrice(candle.openPrice())
                .highPrice(candle.highPrice())
                .lowPrice(candle.lowPrice())
                .closePrice(candle.closePrice())
                .volume(candle.volume())
                .fluctuationRate(candle.fluctuationRate())
                .createdAt(now)
                .build());
          }
          case "Y" -> {
            yearlyRepository.save(StockPriceYearly.builder()
                .stockId(stockId)
                .tradeYear(candle.tradeDate().getYear())
                .openPrice(candle.openPrice())
                .highPrice(candle.highPrice())
                .lowPrice(candle.lowPrice())
                .closePrice(candle.closePrice())
                .volume(candle.volume())
                .fluctuationRate(candle.fluctuationRate())
                .createdAt(now)
                .build());
          }
        }
        saved++;
      } catch (Exception e) {
        log.debug("Skipped duplicate candle. stockId={}, period={}, date={}",
            stockId, periodCode, candle.tradeDate());
      }
    }
    return saved;
  }

  private LocalDate resolveStartDate(Long stockId, String periodCode) {
    LocalDate lastDate = switch (periodCode) {
      case "D" -> dailyRepository.findMaxTradeDateByStockId(stockId);
      case "W" -> weeklyRepository.findMaxTradeWeekByStockId(stockId);
      default -> null;
    };
    if (lastDate != null) {
      log.info("Resuming backfill from lastDate={} for stockId={}, period={}", lastDate, stockId, periodCode);
      return lastDate.plusDays(1);
    }
    return BACKFILL_START;
  }

  private void throttle() {
    try {
      Thread.sleep(THROTTLE_MILLIS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }
}
