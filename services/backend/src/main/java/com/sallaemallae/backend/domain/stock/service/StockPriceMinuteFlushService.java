package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceMinute;
import com.sallaemallae.backend.domain.stock.repository.StockPriceMinuteRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.support.StockMarketConstants;
import com.sallaemallae.backend.infra.kis.KisApiException;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.stock.KisDomesticStockClient;
import com.sallaemallae.backend.infra.kis.stock.KisMinuteCandleData;
import com.sallaemallae.backend.infra.kis.stock.KisMinuteCandleItem;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
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
  private static final LocalTime MARKET_OPEN = LocalTime.of(9, 0);
  private static final LocalTime MARKET_CLOSE = LocalTime.of(15, 31);

  private final StockRepository stockRepository;
  private final StockPriceMinuteRepository minuteRepository;
  private final KisDomesticStockClient kisDomesticStockClient;
  private final KisProperties kisProperties;

  private final AtomicBoolean initialLoadDone = new AtomicBoolean(false);

  @Scheduled(cron = "0 * 9-15 * * MON-FRI", zone = "Asia/Seoul")
  @Transactional
  public void flushMinuteCandles() {
    log.info("Minute candle flush triggered. kisConfigured={}", kisProperties.isConfigured());

    if (!kisProperties.isConfigured()) {
      return;
    }

    LocalTime now = LocalTime.now(KST);
    if (now.isBefore(MARKET_OPEN) || now.isAfter(MARKET_CLOSE)) {
      log.info("Minute candle flush skipped. outside market hours. now={}", now);
      return;
    }

    List<Stock> activeStocks = stockRepository.findAllByIsActiveTrueOrderByNameAsc();
    String marketCode = StockMarketConstants.DOMESTIC_MARKET_CODE;
    boolean fullLoad = !initialLoadDone.get();

    int totalSaved = 0;
    int errors = 0;

    for (Stock stock : activeStocks) {
      try {
        KisMinuteCandleData data;
        if (fullLoad) {
          data = kisDomesticStockClient.getAllMinuteCandles(marketCode, stock.getTicker());
        } else {
          data = kisDomesticStockClient.getMinuteCandles(marketCode, stock.getTicker());
        }

        int saved = saveCandles(stock.getId(), data.candles());
        totalSaved += saved;

        Thread.sleep(60);
      } catch (KisApiException e) {
        errors++;
        log.warn("Failed to fetch minute candles. ticker={}", stock.getTicker(), e);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        log.warn("Minute candle flush interrupted.");
        return;
      } catch (Exception e) {
        errors++;
        log.warn("Unexpected error during minute candle flush. ticker={}", stock.getTicker(), e);
      }
    }

    if (fullLoad) {
      initialLoadDone.set(true);
    }

    log.info("Minute candle flush completed. fullLoad={}, saved={}, errors={}", fullLoad, totalSaved, errors);
  }

  private int saveCandles(Long stockId, List<KisMinuteCandleItem> candles) {
    OffsetDateTime now = OffsetDateTime.now(KST);
    int saved = 0;

    for (KisMinuteCandleItem candle : candles) {
      if (minuteRepository.existsByStockIdAndTradeTimestamp(stockId, candle.timestamp())) {
        continue;
      }

      minuteRepository.save(StockPriceMinute.builder()
          .stockId(stockId)
          .tradeTimestamp(candle.timestamp())
          .openPrice(candle.openPrice())
          .highPrice(candle.highPrice())
          .lowPrice(candle.lowPrice())
          .closePrice(candle.closePrice())
          .volume(candle.volume())
          .createdAt(now)
          .build());
      saved++;
    }

    return saved;
  }
}
