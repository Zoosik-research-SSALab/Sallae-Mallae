package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockListItemResponse;
import com.sallaemallae.backend.domain.stock.dto.StockListResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.service.StockTopListSupport.MarketCapFilter;
import com.sallaemallae.backend.domain.stock.service.StockTopListSupport.SectorFilter;
import com.sallaemallae.backend.domain.stock.service.StockTopListSupport.SignalFilter;
import com.sallaemallae.backend.domain.stock.service.StockTopListSupport.StockTopListCandidate;
import com.sallaemallae.backend.domain.stock.service.StockTopListSupport.StockTopListQuery;
import com.sallaemallae.backend.domain.stock.support.StockMarketConstants;
import com.sallaemallae.backend.domain.user.service.WatchlistService;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.infra.kis.KisApiException;
import com.sallaemallae.backend.infra.kis.cache.CachedResult;
import com.sallaemallae.backend.infra.kis.stock.CachedKisDomesticStockGateway;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
import com.sallaemallae.backend.infra.kis.stock.KisTopInterestStockData;
import com.sallaemallae.backend.infra.kis.stock.KisTopInterestStockItem;
import java.util.ArrayList;
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

  private static final int MAX_TOP_STOCKS = 200;

  private final CachedKisDomesticStockGateway cachedKisDomesticStockGateway;
  private final StockRepository stockRepository;
  private final StockPriceDailyRepository stockPriceDailyRepository;
  private final WatchlistService watchlistService;

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

    try {
      CachedResult<KisTopInterestStockData> rankingResult = cachedKisDomesticStockGateway.getTopInterestStocks(
          StockMarketConstants.DOMESTIC_MARKET_CODE,
          MAX_TOP_STOCKS
      );
      KisTopInterestStockData ranking = rankingResult.value();
      Map<String, Stock> stockMetadata = loadStockMetadata(ranking.items());
      Set<Long> watchlistedStockIds = loadWatchlistedStockIds(userId);

      List<StockTopListCandidate> candidates = ranking.items().stream()
          .map(item -> toCandidate(item, stockMetadata.get(item.ticker()), watchlistedStockIds))
          .filter(candidate -> StockTopListSupport.matchesKeyword(candidate, query.keyword()))
          .filter(candidate -> StockTopListSupport.matchesSector(candidate, query.sector()))
          .filter(candidate -> StockTopListSupport.matchesMarketCap(candidate, query.marketCap()))
          .sorted(StockTopListSupport.comparator(query.sort()))
          .toList();

      List<StockTopListCandidate> signalFiltered = candidates.stream()
          .filter(candidate -> query.signal() == null || candidate.signal() == query.signal())
          .toList();

      List<StockListItemResponse> responseItems = paginate(signalFiltered, query);
      return new StockListResponse(StockTopListSupport.countSignals(candidates), responseItems);
    } catch (KisApiException e) {
      log.warn("Failed to fetch KIS top stock list. code={}", e.getCode(), e);
      return buildLocalFallbackResponse(userId, query);
    }
  }

  private StockListResponse buildLocalFallbackResponse(Long userId, StockTopListQuery query) {
    List<Stock> activeStocks = loadActiveStocks();
    Map<Long, StockPriceDaily> latestDailyPrices = loadLatestDailyPrices(activeStocks);
    Set<Long> watchlistedStockIds = loadWatchlistedStockIds(userId);

    List<StockTopListCandidate> candidates = new ArrayList<>();
    int sourceRank = 1;
    for (Stock stock : activeStocks) {
      StockPriceDaily latestPrice = latestDailyPrices.get(stock.getId());
      Float fluctuationRate = latestPrice != null ? latestPrice.getFluctuationRate() : null;
      Integer price = latestPrice != null ? latestPrice.getClosePrice() : null;
      SignalFilter signal = StockTopListSupport.resolveSignal(fluctuationRate);

      candidates.add(new StockTopListCandidate(
          sourceRank,
          stock.getId(),
          stock.getTicker(),
          stock.getName(),
          stock.getGicsSector(),
          price,
          fluctuationRate,
          signal,
          StockTopListSupport.resolveConfidence(sourceRank, fluctuationRate, signal),
          watchlistedStockIds.contains(stock.getId()),
          resolveMarketCap(stock, price),
          resolveSectorFilter(stock, stock.getName())
      ));
      sourceRank++;
    }

    List<StockTopListCandidate> filtered = candidates.stream()
        .filter(candidate -> StockTopListSupport.matchesKeyword(candidate, query.keyword()))
        .filter(candidate -> StockTopListSupport.matchesSector(candidate, query.sector()))
        .filter(candidate -> StockTopListSupport.matchesMarketCap(candidate, query.marketCap()))
        .sorted(StockTopListSupport.comparator(query.sort()))
        .toList();

    List<StockTopListCandidate> signalFiltered = filtered.stream()
        .filter(candidate -> query.signal() == null || candidate.signal() == query.signal())
        .toList();

    log.info(
        "Serving stock top list from local fallback. totalCandidates={}, filteredCandidates={}",
        candidates.size(),
        signalFiltered.size()
    );

    List<StockTopListCandidate> visibleCandidates = paginateCandidates(signalFiltered, query);
    List<StockTopListCandidate> enrichedVisibleCandidates = enrichFallbackCandidates(visibleCandidates);

    return new StockListResponse(
        StockTopListSupport.countSignals(enrichedVisibleCandidates),
        toResponses(enrichedVisibleCandidates)
    );
  }

  private List<Stock> loadActiveStocks() {
    try {
      return stockRepository.findAllByIsActiveTrueOrderByNameAsc();
    } catch (RuntimeException e) {
      log.warn("Failed to load local stock metadata for fallback stock list.", e);
      return List.of();
    }
  }

  private Map<String, Stock> loadStockMetadata(List<KisTopInterestStockItem> rankingItems) {
    List<String> tickers = rankingItems.stream()
        .map(KisTopInterestStockItem::ticker)
        .filter(Objects::nonNull)
        .distinct()
        .toList();
    if (tickers.isEmpty()) {
      return Map.of();
    }

    try {
      return stockRepository.findAllByTickerInAndIsActiveTrue(tickers).stream()
          .collect(Collectors.toMap(Stock::getTicker, Function.identity(), (left, right) -> left));
    } catch (RuntimeException e) {
      log.warn("Failed to enrich top stock list with local stock metadata.", e);
      return Map.of();
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
      log.warn("Failed to load latest daily prices for fallback stock list.", e);
      return Map.of();
    }
  }

  private StockTopListCandidate toCandidate(
      KisTopInterestStockItem item,
      Stock stock,
      Set<Long> watchlistedStockIds
  ) {
    SectorFilter sectorFilter = resolveSectorFilter(stock, item.name());
    String sectorLabel = stock != null && stock.getGicsSector() != null && !stock.getGicsSector().isBlank()
        ? stock.getGicsSector()
        : sectorFilter != null ? sectorFilter.label() : null;
    SignalFilter signal = StockTopListSupport.resolveSignal(item.fluctuationRate());
    int confidence = StockTopListSupport.resolveConfidence(item.dataRank(), item.fluctuationRate(), signal);
    Long stockId = stock != null ? stock.getId() : null;

    return new StockTopListCandidate(
        item.dataRank(),
        stockId,
        item.ticker(),
        resolveName(stock, item),
        sectorLabel,
        item.price(),
        item.fluctuationRate(),
        signal,
        confidence,
        stockId != null && watchlistedStockIds.contains(stockId),
        resolveMarketCap(stock, item.price()),
        sectorFilter
    );
  }

  private List<StockListItemResponse> paginate(List<StockTopListCandidate> candidates, StockTopListQuery query) {
    return toResponses(paginateCandidates(candidates, query));
  }

  private List<StockTopListCandidate> paginateCandidates(List<StockTopListCandidate> candidates, StockTopListQuery query) {
    if (candidates.isEmpty()) {
      return List.of();
    }

    int start = Math.min(query.offset(), candidates.size());
    int end = Math.min(start + query.limit(), candidates.size());
    return candidates.subList(start, end);
  }

  private List<StockListItemResponse> toResponses(List<StockTopListCandidate> candidates) {
    List<StockListItemResponse> responseItems = new ArrayList<>();
    for (int index = 0; index < candidates.size(); index++) {
      responseItems.add(StockTopListSupport.toResponse(candidates.get(index), index + 1));
    }
    return responseItems;
  }

  private List<StockTopListCandidate> enrichFallbackCandidates(List<StockTopListCandidate> candidates) {
    List<StockTopListCandidate> enriched = new ArrayList<>(candidates.size());
    for (StockTopListCandidate candidate : candidates) {
      if (candidate.price() != null && candidate.fluctuationRate() != null) {
        enriched.add(candidate);
        continue;
      }

      try {
        CachedResult<KisQuoteData> quoteResult = cachedKisDomesticStockGateway.getQuote(
            StockMarketConstants.DOMESTIC_MARKET_CODE,
            candidate.ticker()
        );
        KisQuoteData quote = quoteResult.value();
        SignalFilter signal = StockTopListSupport.resolveSignal(quote.changeRate());
        enriched.add(new StockTopListCandidate(
            candidate.sourceRank(),
            candidate.stockId(),
            candidate.ticker(),
            candidate.name(),
            candidate.gicsSector(),
            quote.currentPrice(),
            quote.changeRate(),
            signal,
            StockTopListSupport.resolveConfidence(candidate.sourceRank(), quote.changeRate(), signal),
            candidate.isWatchlisted(),
            candidate.marketCap(),
            candidate.sectorFilter()
        ));
      } catch (KisApiException e) {
        log.warn("Failed to enrich fallback stock list with KIS quote. ticker={}, code={}", candidate.ticker(), e.getCode());
        enriched.add(candidate);
      }
    }
    return enriched;
  }

  private String resolveName(Stock stock, KisTopInterestStockItem item) {
    if (stock != null && stock.getName() != null && !stock.getName().isBlank()) {
      return stock.getName();
    }
    return item.name();
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

  private SectorFilter resolveSectorFilter(Stock stock, String fallbackName) {
    String text = StockTopListSupport.normalize(String.join(
        " ",
        stock != null && stock.getGicsSector() != null ? stock.getGicsSector() : "",
        stock != null && stock.getCategory() != null ? stock.getCategory() : "",
        stock != null && stock.getName() != null ? stock.getName() : "",
        fallbackName != null ? fallbackName : ""
    ));

    if (containsAny(text, "information technology", "semiconductor", "software", "it", "반도체", "전자", "internet")) {
      return SectorFilter.IT;
    }
    if (containsAny(text, "financial", "finance", "bank", "insurance", "securities", "금융", "증권", "보험")) {
      return SectorFilter.FINANCE;
    }
    if (containsAny(text, "automobile", "auto", "motor", "자동차", "모빌리티", "기아", "현대")) {
      return SectorFilter.AUTO;
    }
    if (containsAny(text, "health care", "bio", "biotech", "pharma", "제약", "바이오", "헬스")) {
      return SectorFilter.BIO;
    }
    if (containsAny(text, "battery", "secondary battery", "2차전지", "에너지저장", "양극재", "음극재")) {
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
