package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.infra.kis.cache.MarketCacheKeyFactory;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheRepository;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheTtlPolicy;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
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
    if (tickers == null || tickers.isEmpty()) {
      return Map.of();
    }
    List<String> tickerList = List.copyOf(tickers);
    List<String> keys = tickerList.stream()
        .map(ticker -> cacheKeyFactory.bulkQuote(marketCode, ticker))
        .toList();

    Map<String, KisQuoteData> cachedByKey = cacheRepository.multiGet(keys, KisQuoteData.class);

    Map<String, KisQuoteData> result = new HashMap<>();
    for (int i = 0; i < tickerList.size(); i++) {
      KisQuoteData quote = cachedByKey.get(keys.get(i));
      if (quote != null) {
        result.put(tickerList.get(i), quote);
      }
    }
    return result;
  }
}
