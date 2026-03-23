package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.support.StockMarketConstants;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
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
public class StockPriceDailyCloseService {

  private static final ZoneId KST = ZoneId.of("Asia/Seoul");

  private final StockRepository stockRepository;
  private final StockPriceDailyRepository dailyRepository;
  private final StockQuoteCacheService stockQuoteCacheService;
  private final KisProperties kisProperties;

  @Scheduled(cron = "0 35 15 * * MON-FRI", zone = "Asia/Seoul")
  @Transactional
  public void saveDailyClose() {
    if (!kisProperties.isConfigured()) {
      return;
    }

    List<Stock> activeStocks = stockRepository.findAllByIsActiveTrueOrderByNameAsc();
    String marketCode = StockMarketConstants.DOMESTIC_MARKET_CODE;
    LocalDate today = LocalDate.now(KST);
    OffsetDateTime now = OffsetDateTime.now(KST);

    Map<String, KisQuoteData> quoteCache = stockQuoteCacheService.getAll(
        marketCode,
        activeStocks.stream().map(Stock::getTicker).toList()
    );

    int saved = 0;
    for (Stock stock : activeStocks) {
      KisQuoteData quote = quoteCache.get(stock.getTicker());
      if (quote == null || quote.currentPrice() == null) {
        continue;
      }
      if (dailyRepository.existsByStockIdAndTradeDate(stock.getId(), today)) {
        continue;
      }

      dailyRepository.save(StockPriceDaily.builder()
          .stockId(stock.getId())
          .tradeDate(today)
          .openPrice(quote.openPrice())
          .highPrice(quote.highPrice())
          .lowPrice(quote.lowPrice())
          .closePrice(quote.currentPrice())
          .volume(quote.volume())
          .fluctuationRate(quote.changeRate())
          .createdAt(now)
          .build());
      saved++;
    }

    log.info("Daily close save completed. date={}, saved={}", today, saved);
  }
}
