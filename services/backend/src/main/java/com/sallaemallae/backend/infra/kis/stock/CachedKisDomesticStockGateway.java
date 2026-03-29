package com.sallaemallae.backend.infra.kis.stock;

import com.sallaemallae.backend.infra.kis.cache.CachedResult;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheKeyFactory;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheRepository;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheTtlPolicy;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CachedKisDomesticStockGateway {

  private final MarketCacheRepository cacheRepository;
  private final MarketCacheKeyFactory cacheKeyFactory;
  private final MarketCacheTtlPolicy ttlPolicy;
  private final KisDomesticStockClient kisDomesticStockClient;

  public CachedResult<KisQuoteData> getQuote(String marketCode, String ticker) {
    String cacheKey = cacheKeyFactory.quote(marketCode, ticker);
    return cacheRepository.get(cacheKey, KisQuoteData.class)
        .map(value -> new CachedResult<>(cacheKey, true, value))
        .orElseGet(() -> {
          KisQuoteData fresh = kisDomesticStockClient.getQuote(marketCode, ticker);
          cacheRepository.put(cacheKey, fresh, ttlPolicy.quoteTtl());
          return new CachedResult<>(cacheKey, false, fresh);
        });
  }

  public CachedResult<KisTopInterestStockData> getTopInterestStocks(String marketCode, int maxItems) {
    String cacheKey = cacheKeyFactory.topInterest(marketCode, maxItems);
    String staleCacheKey = cacheKeyFactory.topInterestStale(marketCode, maxItems);
    return cacheRepository.get(cacheKey, KisTopInterestStockData.class)
        .map(value -> new CachedResult<>(cacheKey, true, value))
        .orElseGet(() -> {
          try {
            KisTopInterestStockData fresh = kisDomesticStockClient.getTopInterestStocks(marketCode, maxItems);
            cacheRepository.put(cacheKey, fresh, ttlPolicy.topInterestTtl());
            cacheRepository.put(staleCacheKey, fresh, ttlPolicy.topInterestStaleTtl());
            return new CachedResult<>(cacheKey, false, fresh);
          } catch (RuntimeException e) {
            var stale = cacheRepository.get(staleCacheKey, KisTopInterestStockData.class);
            if (stale.isPresent()) {
              return new CachedResult<>(staleCacheKey, true, stale.get());
            }
            throw e;
          }
        });
  }

  public CachedResult<KisMinuteCandleData> getMinuteCandles(String marketCode, String ticker) {
    String cacheKey = cacheKeyFactory.minuteCandle(marketCode, ticker);
    return cacheRepository.get(cacheKey, KisMinuteCandleData.class)
        .map(value -> new CachedResult<>(cacheKey, true, value))
        .orElseGet(() -> {
          KisMinuteCandleData fresh = kisDomesticStockClient.getMinuteCandles(marketCode, ticker);
          cacheRepository.put(cacheKey, fresh, ttlPolicy.minuteCandleTtl());
          return new CachedResult<>(cacheKey, false, fresh);
        });
  }

  public CachedResult<KisPeriodPriceData> getPeriodPrices(
      String marketCode,
      String ticker,
      String periodCode,
      LocalDate startDate,
      LocalDate endDate,
      boolean adjusted
  ) {
    String cacheKey = cacheKeyFactory.period(marketCode, ticker, periodCode, startDate, endDate, adjusted);
    return cacheRepository.get(cacheKey, KisPeriodPriceData.class)
        .map(value -> new CachedResult<>(cacheKey, true, value))
        .orElseGet(() -> {
          KisPeriodPriceData fresh = kisDomesticStockClient.getPeriodPrices(
              marketCode,
              ticker,
              periodCode,
              startDate,
              endDate,
              adjusted
          );
          cacheRepository.put(cacheKey, fresh, ttlPolicy.periodTtl(endDate));
          return new CachedResult<>(cacheKey, false, fresh);
        });
  }
}
