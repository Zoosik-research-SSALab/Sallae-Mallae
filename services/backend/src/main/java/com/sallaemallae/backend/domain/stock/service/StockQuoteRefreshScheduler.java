package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.support.StockMarketConstants;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.stock.KisDomesticStockClient;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
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

  private final StockRepository stockRepository;
  private final KisDomesticStockClient kisDomesticStockClient;
  private final KisProperties kisProperties;
  private final StockQuoteCacheService stockQuoteCacheService;

  @Scheduled(fixedRate = 60_000, initialDelay = 25_000)
  public void refreshAllQuotes() {
    if (!kisProperties.isConfigured()) {
      log.debug("KIS API not configured. Skipping bulk quote refresh.");
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

    for (Stock stock : activeStocks) {
      try {
        KisQuoteData quote = kisDomesticStockClient.getQuote(marketCode, stock.getTicker());
        stockQuoteCacheService.put(marketCode, stock.getTicker(), quote);
        success++;
      } catch (Exception e) {
        log.warn("Failed to fetch quote for ticker={}. error={}", stock.getTicker(), e.getMessage());
        fail++;
      }
      throttle();
    }

    log.info("Bulk quote refresh completed. total={}, success={}, fail={}", activeStocks.size(), success, fail);
  }

  private void throttle() {
    try {
      Thread.sleep(THROTTLE_MILLIS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }
}
