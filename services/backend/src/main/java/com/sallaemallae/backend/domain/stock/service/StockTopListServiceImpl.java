package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockListItemResponse;
import com.sallaemallae.backend.domain.stock.dto.StockListResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.service.StockTopListSupport.SectorFilter;
import com.sallaemallae.backend.domain.stock.service.StockTopListSupport.SignalFilter;
import com.sallaemallae.backend.domain.stock.service.StockTopListSupport.StockTopListCandidate;
import com.sallaemallae.backend.domain.stock.service.StockTopListSupport.StockTopListQuery;
import com.sallaemallae.backend.domain.stock.support.StockMarketConstants;
import com.sallaemallae.backend.domain.user.service.WatchlistService;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class StockTopListServiceImpl implements StockTopListService {

  private final StockRepository stockRepository;
  private final StockPriceDailyRepository stockPriceDailyRepository;
  private final WatchlistService watchlistService;
  private final StockDividendYieldSnapshotService stockDividendYieldSnapshotService;
  private final StockQuoteCacheService stockQuoteCacheService;

  @Override
  public StockListResponse getTopStocks(
      Long userId,
      String signal,
      String sector,
      String marketCap,
      String sort,
      String keyword,
      Integer offset,
      Integer limit
  ) {
    StockTopListQuery query = StockTopListQuery.of(signal, sector, marketCap, sort, keyword, offset, limit);
    Map<String, Float> dividendYieldMap = loadDividendYieldMap();

    List<Stock> activeStocks = loadActiveStocks();
    Map<String, KisQuoteData> quoteCache = stockQuoteCacheService.getAll(
        StockMarketConstants.DOMESTIC_MARKET_CODE,
        activeStocks.stream().map(Stock::getTicker).toList()
    );
    Map<Long, StockPriceDaily> latestDailyPrices = loadLatestDailyPrices(activeStocks);
    Map<Long, Float> dbDividendYieldByStockId = loadDbDividendYieldByStockIds(activeStocks);
    Set<Long> watchlistedStockIds = loadWatchlistedStockIds(userId);

    List<StockTopListCandidate> candidates = new ArrayList<>();
    int sourceRank = 1;
    for (Stock stock : activeStocks) {
      KisQuoteData quote = quoteCache.get(stock.getTicker());
      StockPriceDaily latestPrice = latestDailyPrices.get(stock.getId());

      Integer price = quote != null ? quote.currentPrice()
          : (latestPrice != null ? latestPrice.getClosePrice() : null);
      Float fluctuationRate = quote != null ? quote.changeRate()
          : (latestPrice != null ? latestPrice.getFluctuationRate() : null);
      Long tradingVolume = quote != null ? quote.volume()
          : (latestPrice != null ? latestPrice.getVolume() : null);
      Long tradingValue = resolveTradingValue(price, tradingVolume, null);
      SignalFilter signalFilter = StockTopListSupport.resolveSignal(fluctuationRate);

      candidates.add(new StockTopListCandidate(
          sourceRank,
          stock.getId(),
          stock.getTicker(),
          stock.getName(),
          stock.getGicsSector(),
          price,
          fluctuationRate,
          tradingValue,
          tradingVolume,
          resolveDividendYield(stock.getId(), stock.getTicker(), dbDividendYieldByStockId, dividendYieldMap),
          signalFilter,
          StockTopListSupport.resolveConfidence(sourceRank, fluctuationRate, signalFilter),
          watchlistedStockIds.contains(stock.getId()),
          resolveMarketCap(stock, price),
          resolveSectorFilter(stock, stock.getName())
      ));
      sourceRank++;
    }

    List<StockTopListCandidate> filtered = candidates.stream()
        .filter(c -> StockTopListSupport.matchesKeyword(c, query.keyword()))
        .filter(c -> StockTopListSupport.matchesSector(c, query.sector()))
        .filter(c -> StockTopListSupport.matchesMarketCap(c, query.marketCap()))
        .sorted(StockTopListSupport.comparator(query.sort()))
        .toList();

    List<StockTopListCandidate> signalFiltered = filterSignalCandidates(filtered, query);
    return new StockListResponse(
        signalFiltered.size(),
        StockTopListSupport.countSignals(filtered),
        paginate(signalFiltered, query)
    );
  }

  private List<StockTopListCandidate> filterSignalCandidates(
      List<StockTopListCandidate> candidates,
      StockTopListQuery query
  ) {
    return candidates.stream()
        .filter(candidate -> query.signal() == null || candidate.signal() == query.signal())
        .toList();
  }

  private List<Stock> loadActiveStocks() {
    try {
      return stockRepository.findAllByIsActiveTrueOrderByNameAsc();
    } catch (RuntimeException e) {
      log.warn("Failed to load active stocks for stock list.", e);
      return List.of();
    }
  }

  private Set<Long> loadWatchlistedStockIds(Long userId) {
    if (userId == null) {
      return Set.of();
    }

    try {
      return watchlistService.getWatchlistedStockIds(userId);
    } catch (RuntimeException e) {
      log.warn("Failed to enrich top stock list with watchlist data. userId={}", userId, e);
      return Set.of();
    }
  }

  private Map<Long, StockPriceDaily> loadLatestDailyPrices(List<Stock> stocks) {
    List<Long> stockIds = stocks.stream()
        .map(Stock::getId)
        .filter(Objects::nonNull)
        .toList();
    if (stockIds.isEmpty()) {
      return Map.of();
    }

    try {
      return stockPriceDailyRepository.findLatestByStockIdIn(stockIds).stream()
          .collect(Collectors.toMap(StockPriceDaily::getStockId, Function.identity(), (left, right) -> left));
    } catch (RuntimeException e) {
      log.warn("Failed to load latest daily prices for stock list.", e);
      return Map.of();
    }
  }

  private List<StockListItemResponse> paginate(List<StockTopListCandidate> candidates, StockTopListQuery query) {
    return toResponses(paginateCandidates(candidates, query), query.offset());
  }

  private List<StockTopListCandidate> paginateCandidates(List<StockTopListCandidate> candidates, StockTopListQuery query) {
    if (candidates.isEmpty()) {
      return List.of();
    }

    int start = Math.min(query.offset(), candidates.size());
    int end = Math.min(start + query.limit(), candidates.size());
    return candidates.subList(start, end);
  }

  private List<StockListItemResponse> toResponses(List<StockTopListCandidate> candidates, int offset) {
    List<StockListItemResponse> responseItems = new ArrayList<>();
    for (int index = 0; index < candidates.size(); index++) {
      responseItems.add(StockTopListSupport.toResponse(candidates.get(index), offset + index + 1));
    }
    return responseItems;
  }

  private Map<String, Float> loadDividendYieldMap() {
    try {
      Map<String, Float> dividendYieldMap = stockDividendYieldSnapshotService.getDividendYieldMap();
      return dividendYieldMap == null ? Map.of() : dividendYieldMap;
    } catch (RuntimeException e) {
      log.warn("Failed to load dividend yield snapshot for stock top list.", e);
      return Map.of();
    }
  }

  private Map<Long, Float> loadDbDividendYieldByStockIds(Collection<Stock> stocks) {
    List<Long> stockIds = stocks.stream()
        .map(Stock::getId)
        .filter(Objects::nonNull)
        .distinct()
        .toList();
    if (stockIds.isEmpty()) {
      return Map.of();
    }

    try {
      Map<Long, Float> dividendYieldMap = stockDividendYieldSnapshotService.getLatestDividendYieldByStockIds(stockIds);
      return dividendYieldMap == null ? Map.of() : dividendYieldMap;
    } catch (RuntimeException e) {
      log.warn("Failed to load dividend yield snapshots from DB for stock top list.", e);
      return Map.of();
    }
  }

  private Float resolveDividendYield(
      Long stockId,
      String ticker,
      Map<Long, Float> dbDividendYieldByStockId,
      Map<String, Float> cachedDividendYieldByTicker
  ) {
    if (stockId != null) {
      Float dbValue = dbDividendYieldByStockId.get(stockId);
      if (dbValue != null) {
        return dbValue;
      }
    }
    return ticker == null ? null : cachedDividendYieldByTicker.get(ticker);
  }

  private Long resolveMarketCap(Stock stock, Integer price) {
    if (stock == null || stock.getOutstandingShares() == null || price == null) {
      return null;
    }
    try {
      return Math.multiplyExact(stock.getOutstandingShares(), price.longValue());
    } catch (ArithmeticException e) {
      log.warn("Market cap overflow while building top stock list. stockId={}", stock.getId(), e);
      return null;
    }
  }

  private Long resolveTradingValue(Integer price, Long tradingVolume, Long sourceTradingValue) {
    if (sourceTradingValue != null) {
      return sourceTradingValue;
    }
    if (price == null || tradingVolume == null) {
      return null;
    }
    try {
      return Math.multiplyExact(price.longValue(), tradingVolume);
    } catch (ArithmeticException e) {
      log.warn("Trading value overflow while building top stock list. price={}, volume={}", price, tradingVolume, e);
      return null;
    }
  }

  private SectorFilter resolveSectorFilter(Stock stock, String fallbackName) {
    String text = StockTopListSupport.normalize(String.join(
        " ",
        stock != null && stock.getGicsSector() != null ? stock.getGicsSector() : "",
        stock != null && stock.getCategory() != null ? stock.getCategory() : "",
        stock != null && stock.getName() != null ? stock.getName() : "",
        fallbackName != null ? fallbackName : ""
    ));

    if (containsAny(
        text,
        "information technology",
        "semiconductor",
        "software",
        "it",
        "internet",
        "\uBC18\uB3C4\uCCB4",
        "\uC804\uC790"
    )) {
      return SectorFilter.IT;
    }
    if (containsAny(
        text,
        "financial",
        "finance",
        "bank",
        "insurance",
        "securities",
        "\uAE08\uC735",
        "\uC99D\uAD8C",
        "\uBCF4\uD5D8"
    )) {
      return SectorFilter.FINANCE;
    }
    if (containsAny(
        text,
        "automobile",
        "auto",
        "motor",
        "mobility",
        "\uC790\uB3D9\uCC28",
        "\uBAA8\uBE4C\uB9AC\uD2F0",
        "\uAE30\uC544",
        "\uD604\uB300"
    )) {
      return SectorFilter.AUTO;
    }
    if (containsAny(
        text,
        "health care",
        "bio",
        "biotech",
        "pharma",
        "\uC81C\uC57D",
        "\uBC14\uC774\uC624",
        "\uD5EC\uC2A4"
    )) {
      return SectorFilter.BIO;
    }
    if (containsAny(
        text,
        "battery",
        "secondary battery",
        "\uBC30\uD130\uB9AC",
        "2\uCC28\uC804\uC9C0",
        "\uC5D0\uB108\uC9C0\uC194\uB8E8\uC158",
        "\uC591\uADF9\uC7AC",
        "\uC74C\uADF9\uC7AC"
    )) {
      return SectorFilter.BATTERY;
    }
    return null;
  }

  private boolean containsAny(String text, String... tokens) {
    for (String token : tokens) {
      if (text.contains(StockTopListSupport.normalize(token))) {
        return true;
      }
    }
    return false;
  }
}
