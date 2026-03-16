package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.stock.dto.StockListFilterCountsResponse;
import com.sallaemallae.backend.domain.stock.dto.StockListItemResponse;
import com.sallaemallae.backend.domain.stock.dto.StockListResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.stock.support.StockMarketConstants;
import com.sallaemallae.backend.domain.user.service.WatchlistService;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.infra.kis.KisApiException;
import com.sallaemallae.backend.infra.kis.stock.KisDomesticStockClient;
import com.sallaemallae.backend.infra.kis.stock.KisTopInterestStockData;
import com.sallaemallae.backend.infra.kis.stock.KisTopInterestStockItem;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
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
  private static final int DEFAULT_LIMIT = 6;
  private static final int MAX_LIMIT = 50;

  private final KisDomesticStockClient kisDomesticStockClient;
  private final StockRepository stockRepository;
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
      KisTopInterestStockData ranking = kisDomesticStockClient.getTopInterestStocks(
          StockMarketConstants.DOMESTIC_MARKET_CODE,
          MAX_TOP_STOCKS
      );
      Map<String, Stock> stockMetadata = loadStockMetadata(ranking.items());
      Set<Long> watchlistedStockIds = loadWatchlistedStockIds(userId);

      List<StockTopListCandidate> candidates = ranking.items().stream()
          .map(item -> toCandidate(item, stockMetadata.get(item.ticker()), watchlistedStockIds))
          .filter(candidate -> matchesKeyword(candidate, query.keyword()))
          .filter(candidate -> matchesSector(candidate, query.sector()))
          .filter(candidate -> matchesMarketCap(candidate, query.marketCap()))
          .sorted(comparator(query.sort()))
          .toList();

      StockListFilterCountsResponse filterCounts = countSignals(candidates);

      List<StockTopListCandidate> signalFiltered = candidates.stream()
          .filter(candidate -> query.signal() == null || candidate.signal() == query.signal())
          .toList();

      List<StockListItemResponse> responseItems = new ArrayList<>();
      int start = Math.min(query.offset(), signalFiltered.size());
      int end = Math.min(start + query.limit(), signalFiltered.size());
      for (int index = start; index < end; index++) {
        responseItems.add(toResponse(signalFiltered.get(index), index + 1));
      }

      return new StockListResponse(filterCounts, responseItems);
    } catch (KisApiException e) {
      log.warn("Failed to fetch KIS top stock list. code={}", e.getCode(), e);
      throw new BusinessException(StockErrorCode.STOCK_MARKET_DATA_UNAVAILABLE);
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

  private StockTopListCandidate toCandidate(
      KisTopInterestStockItem item,
      Stock stock,
      Set<Long> watchlistedStockIds
  ) {
    SectorFilter sectorFilter = resolveSectorFilter(stock, item.name());
    String sectorLabel = stock != null && stock.getGicsSector() != null && !stock.getGicsSector().isBlank()
        ? stock.getGicsSector()
        : sectorFilter != null ? sectorFilter.label() : null;
    SignalFilter signal = resolveSignal(item.fluctuationRate());
    int confidence = resolveConfidence(item.dataRank(), item.fluctuationRate(), signal);
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

  private boolean matchesKeyword(StockTopListCandidate candidate, String keyword) {
    if (keyword == null || keyword.isBlank()) {
      return true;
    }

    String normalizedKeyword = normalize(keyword);
    return normalize(candidate.ticker()).contains(normalizedKeyword)
        || normalize(candidate.name()).contains(normalizedKeyword)
        || normalize(candidate.gicsSector()).contains(normalizedKeyword);
  }

  private boolean matchesSector(StockTopListCandidate candidate, SectorFilter sector) {
    if (sector == null) {
      return true;
    }
    return sector == candidate.sectorFilter();
  }

  private boolean matchesMarketCap(StockTopListCandidate candidate, MarketCapFilter marketCap) {
    if (marketCap == MarketCapFilter.ALL) {
      return true;
    }
    if (candidate.marketCap() == null) {
      return false;
    }
    return marketCap.matches(candidate.marketCap());
  }

  private Comparator<StockTopListCandidate> comparator(SortFilter sort) {
    if (sort == SortFilter.MARKET_CAP) {
      return Comparator
          .comparing(StockTopListCandidate::marketCap, Comparator.nullsLast(Comparator.reverseOrder()))
          .thenComparing(StockTopListCandidate::fluctuationMagnitude, Comparator.reverseOrder())
          .thenComparingInt(StockTopListCandidate::sourceRank);
    }

    return Comparator
        .comparing(StockTopListCandidate::fluctuationMagnitude, Comparator.reverseOrder())
        .thenComparingInt(StockTopListCandidate::sourceRank);
  }

  private StockListFilterCountsResponse countSignals(List<StockTopListCandidate> candidates) {
    Map<SignalFilter, Integer> counts = new EnumMap<>(SignalFilter.class);
    for (SignalFilter signal : SignalFilter.values()) {
      counts.put(signal, 0);
    }
    for (StockTopListCandidate candidate : candidates) {
      counts.computeIfPresent(candidate.signal(), (key, value) -> value + 1);
    }
    return new StockListFilterCountsResponse(
        counts.get(SignalFilter.BUY),
        counts.get(SignalFilter.SELL),
        counts.get(SignalFilter.HOLD)
    );
  }

  private StockListItemResponse toResponse(StockTopListCandidate candidate, int displayRank) {
    return new StockListItemResponse(
        displayRank,
        candidate.stockId(),
        candidate.ticker(),
        candidate.name(),
        candidate.gicsSector(),
        candidate.price(),
        candidate.fluctuationRate(),
        candidate.signal().name(),
        candidate.confidence(),
        candidate.isWatchlisted()
    );
  }

  private SignalFilter resolveSignal(Float fluctuationRate) {
    if (fluctuationRate == null) {
      return SignalFilter.HOLD;
    }
    if (fluctuationRate >= 1.5f) {
      return SignalFilter.BUY;
    }
    if (fluctuationRate <= -1.5f) {
      return SignalFilter.SELL;
    }
    return SignalFilter.HOLD;
  }

  private int resolveConfidence(int sourceRank, Float fluctuationRate, SignalFilter signal) {
    float magnitude = fluctuationRate == null ? 0f : Math.min(Math.abs(fluctuationRate), 8f);
    int base = signal == SignalFilter.HOLD ? 52 : 58;
    int rankBoost = Math.max(0, 30 - Math.max(sourceRank, 1)) / 2;
    int magnitudeBoost = Math.round(magnitude * 4);
    return Math.max(50, Math.min(95, base + rankBoost + magnitudeBoost));
  }

  private SectorFilter resolveSectorFilter(Stock stock, String fallbackName) {
    String text = normalize(String.join(
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
      if (text.contains(normalize(token))) {
        return true;
      }
    }
    return false;
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  private record StockTopListCandidate(
      int sourceRank,
      Long stockId,
      String ticker,
      String name,
      String gicsSector,
      Integer price,
      Float fluctuationRate,
      SignalFilter signal,
      int confidence,
      boolean isWatchlisted,
      Long marketCap,
      SectorFilter sectorFilter
  ) {

    private float fluctuationMagnitude() {
      return fluctuationRate == null ? 0f : Math.abs(fluctuationRate);
    }
  }

  private record StockTopListQuery(
      SignalFilter signal,
      SectorFilter sector,
      MarketCapFilter marketCap,
      SortFilter sort,
      String keyword,
      int offset,
      int limit
  ) {

    private static StockTopListQuery of(
        String signal,
        String sector,
        String marketCap,
        String sort,
        String keyword,
        Integer offset,
        Integer limit
    ) {
      int normalizedOffset = offset == null ? 0 : offset;
      int normalizedLimit = limit == null ? DEFAULT_LIMIT : limit;
      if (normalizedOffset < 0 || normalizedLimit < 1 || normalizedLimit > MAX_LIMIT) {
        throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
      }

      return new StockTopListQuery(
          SignalFilter.from(signal),
          SectorFilter.from(sector),
          MarketCapFilter.from(marketCap),
          SortFilter.from(sort),
          keyword == null ? null : keyword.trim(),
          normalizedOffset,
          normalizedLimit
      );
    }
  }

  private enum SignalFilter {
    BUY,
    SELL,
    HOLD;

    private static SignalFilter from(String value) {
      if (value == null || value.isBlank()) {
        return null;
      }
      try {
        return SignalFilter.valueOf(value.trim().toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException e) {
        throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
      }
    }
  }

  private enum SectorFilter {
    IT("IT"),
    FINANCE("금융"),
    AUTO("자동차"),
    BIO("바이오"),
    BATTERY("2차전지");

    private final String label;

    SectorFilter(String label) {
      this.label = label;
    }

    private String label() {
      return label;
    }

    private static SectorFilter from(String value) {
      if (value == null || value.isBlank()) {
        return null;
      }
      return switch (value.trim()) {
        case "IT" -> IT;
        case "금융" -> FINANCE;
        case "자동차" -> AUTO;
        case "바이오" -> BIO;
        case "2차전지" -> BATTERY;
        default -> throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
      };
    }
  }

  private enum MarketCapFilter {
    ALL,
    LARGE,
    MID;

    private static final long LARGE_CAP_THRESHOLD = 10_000_000_000_000L;
    private static final long MID_CAP_THRESHOLD = 2_000_000_000_000L;

    private boolean matches(Long marketCap) {
      return switch (this) {
        case ALL -> true;
        case LARGE -> marketCap >= LARGE_CAP_THRESHOLD;
        case MID -> marketCap >= MID_CAP_THRESHOLD && marketCap < LARGE_CAP_THRESHOLD;
      };
    }

    private static MarketCapFilter from(String value) {
      if (value == null || value.isBlank()) {
        return ALL;
      }
      try {
        return MarketCapFilter.valueOf(value.trim().toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException e) {
        throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
      }
    }
  }

  private enum SortFilter {
    MARKET_CAP,
    CHANGE;

    private static SortFilter from(String value) {
      if (value == null || value.isBlank()) {
        return CHANGE;
      }
      try {
        return SortFilter.valueOf(value.trim().toUpperCase(Locale.ROOT));
      } catch (IllegalArgumentException e) {
        throw new BusinessException(StockErrorCode.STOCK_MARKET_INPUT_INVALID);
      }
    }
  }
}
