package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.infra.kis.cache.MarketCacheKeyFactory;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheRepository;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheTtlPolicy;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StockQuoteCacheService {

  private final MarketCacheRepository cacheRepository;
  private final MarketCacheKeyFactory cacheKeyFactory;
  private final MarketCacheTtlPolicy ttlPolicy;

  public void put(String marketCode, String ticker, KisQuoteData quote) {
    String key = cacheKeyFactory.bulkQuote(marketCode, ticker);
    cacheRepository.put(key, quote, ttlPolicy.bulkQuoteTtl());
  }

  public Optional<KisQuoteData> get(String marketCode, String ticker) {
    String key = cacheKeyFactory.bulkQuote(marketCode, ticker);
    return cacheRepository.get(key, KisQuoteData.class);
  }

  public Map<String, KisQuoteData> getAll(String marketCode, Collection<String> tickers) {
    Map<String, KisQuoteData> result = new HashMap<>();
    for (String ticker : tickers) {
      get(marketCode, ticker).ifPresent(quote -> result.put(ticker, quote));
    }
    return result;
  }
}
