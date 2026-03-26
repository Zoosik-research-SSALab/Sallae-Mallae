package com.sallaemallae.backend.domain.stock.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import com.sallaemallae.backend.domain.stock.dto.StockListResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.exception.StockErrorCode;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.storage.service.StockIconUrlResolver;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.user.service.WatchlistService;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StockTopListServiceImplTest {

  @Mock
  private StockRepository stockRepository;

  @Mock
  private StockPriceDailyRepository stockPriceDailyRepository;

  @Mock
  private WatchlistService watchlistService;

  @Mock
  private StockDividendYieldSnapshotService stockDividendYieldSnapshotService;

  @Mock
  private StockQuoteCacheService stockQuoteCacheService;

  @Mock
  private StockIconUrlResolver stockIconUrlResolver;

  private StockTopListServiceImpl createService() {
    return new StockTopListServiceImpl(
        stockRepository,
        stockPriceDailyRepository,
        watchlistService,
        stockDividendYieldSnapshotService,
        stockQuoteCacheService,
        stockIconUrlResolver
    );
  }

  @Test
  void getTopStocks_returnsPaginatedListAndCountsFromRedisCache() {
    StockTopListServiceImpl service = createService();

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "\uBC18\uB3C4\uCCB4", 5_919_637_922L);
    Stock naver = stock(2L, "035420", "NAVER", "Information Technology", "IT\uD50C\uB7AB\uD3FC / \uC18C\uD504\uD2B8\uC6E8\uC5B4", 164_263_395L);
    Stock hynix = stock(3L, "000660", "SK hynix", "Information Technology", "\uBC18\uB3C4\uCCB4", 728_002_365L);

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(naver, samsung, hynix));
    given(stockQuoteCacheService.getAll(any(), any())).willReturn(Map.of(
        "005930", quoteData("005930", 70000, 2.2f, 100000L),
        "035420", quoteData("035420", 200000, 0.3f, 50000L),
        "000660", quoteData("000660", 180000, -2.0f, 70000L)
    ));
    given(watchlistService.getWatchlistedStockIds(99L)).willReturn(Set.of(1L));

    StockListResponse response = service.getTopStocks(99L, null, null, null, "CHANGE", null, 0, 2);

    assertThat(response.filterCounts().buy()).isEqualTo(1);
    assertThat(response.filterCounts().sell()).isEqualTo(1);
    assertThat(response.filterCounts().hold()).isEqualTo(1);
    assertThat(response.stocks()).hasSize(2);
    assertThat(response.stocks().get(0).ticker()).isEqualTo("005930");
    assertThat(response.stocks().get(0).signal()).isEqualTo("BUY");
    assertThat(response.stocks().get(0).isWatchlisted()).isTrue();
    assertThat(response.stocks().get(1).ticker()).isEqualTo("000660");
    assertThat(response.stocks().get(1).signal()).isEqualTo("SELL");
    assertThat(response.totalCount()).isEqualTo(3);
  }

  @Test
  void getTopStocks_skipsWatchlistLookupWhenUnauthenticated() {
    StockTopListServiceImpl service = createService();

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "\uBC18\uB3C4\uCCB4", 5_919_637_922L);
    StockPriceDaily samsungPrice = dailyPrice(1L, 70300, 2.15f, 1_000_000L);

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(samsung));
    given(stockQuoteCacheService.getAll(any(), any())).willReturn(Map.of());
    given(stockPriceDailyRepository.findLatestByStockIdIn(List.of(1L))).willReturn(List.of(samsungPrice));

    StockListResponse response = service.getTopStocks(null, "BUY", List.of("SEMICONDUCTOR"), "LARGE", "MARKET_CAP", "samsung", 0, 10);

    assertThat(response.filterCounts().buy()).isEqualTo(1);
    assertThat(response.stocks()).hasSize(1);
    assertThat(response.stocks().get(0).isWatchlisted()).isFalse();
    assertThat(response.stocks().get(0).tradingVolume()).isEqualTo(1_000_000L);
    assertThat(response.stocks().get(0).tradingValue()).isEqualTo(70_300_000_000L);
    verifyNoInteractions(watchlistService);
  }

  @Test
  void getTopStocks_throwsBusinessExceptionWhenPaginationIsInvalid() {
    StockTopListServiceImpl service = createService();

    assertThatThrownBy(() -> service.getTopStocks(null, null, null, null, null, null, -1, 2))
        .isInstanceOfSatisfying(BusinessException.class, exception ->
            assertThat(exception.getErrorCode()).isEqualTo(StockErrorCode.STOCK_MARKET_INPUT_INVALID)
        );
  }

  @Test
  void getTopStocks_fallsBackToDbWhenRedisCacheEmpty() {
    StockTopListServiceImpl service = createService();

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "\uBC18\uB3C4\uCCB4", 5_919_637_922L);
    Stock hynix = stock(2L, "000660", "SK hynix", "Information Technology", "\uBC18\uB3C4\uCCB4", 728_002_365L);
    StockPriceDaily samsungPrice = dailyPrice(1L, 70300, 2.15f, 1_000_000L);
    StockPriceDaily hynixPrice = dailyPrice(2L, 182000, -1.75f, 700_000L);

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(hynix, samsung));
    given(stockQuoteCacheService.getAll(any(), any())).willReturn(Map.of());
    given(stockPriceDailyRepository.findLatestByStockIdIn(List.of(2L, 1L)))
        .willReturn(List.of(samsungPrice, hynixPrice));
    given(watchlistService.getWatchlistedStockIds(99L)).willReturn(Set.of(1L));

    StockListResponse response = service.getTopStocks(99L, null, null, null, "CHANGE", null, 0, 2);

    assertThat(response.filterCounts().buy()).isEqualTo(1);
    assertThat(response.filterCounts().sell()).isEqualTo(1);
    assertThat(response.stocks()).extracting(item -> item.ticker()).containsExactly("005930", "000660");
    assertThat(response.stocks().get(0).isWatchlisted()).isTrue();
  }

  @Test
  void getTopStocks_capsLimitAtThirty() {
    StockTopListServiceImpl service = createService();

    List<Stock> stocks = new ArrayList<>();
    for (int i = 1; i <= 40; i++) {
      String ticker = "%06d".formatted(i);
      stocks.add(stock((long) i, ticker, "Stock " + i, "Information Technology", "\uAE30\uD0C0", 1_000_000L));
    }

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(stocks);
    given(stockQuoteCacheService.getAll(any(), any())).willReturn(Map.of());

    StockListResponse response = service.getTopStocks(null, null, null, null, "CHANGE", null, 0, 50);

    assertThat(response.stocks()).hasSize(30);
  }

  @Test
  void getTopStocks_sortsByMarketCap() {
    StockTopListServiceImpl service = createService();

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "\uBC18\uB3C4\uCCB4", 5_919_637_922L);
    Stock naver = stock(2L, "035420", "NAVER", "Information Technology", "IT\uD50C\uB7AB\uD3FC / \uC18C\uD504\uD2B8\uC6E8\uC5B4", 164_263_395L);
    Stock hynix = stock(3L, "000660", "SK hynix", "Information Technology", "\uBC18\uB3C4\uCCB4", 728_002_365L);

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(naver, samsung, hynix));
    given(stockQuoteCacheService.getAll(any(), any())).willReturn(Map.of(
        "005930", quoteData("005930", 70300, 2.15f, 1_000_000L),
        "035420", quoteData("035420", 200000, 0.30f, 500_000L),
        "000660", quoteData("000660", 182000, -1.75f, 700_000L)
    ));

    StockListResponse response = service.getTopStocks(null, null, null, null, "MARKET_CAP", null, 0, 3);

    assertThat(response.stocks()).extracting(item -> item.ticker()).containsExactly("005930", "000660", "035420");
  }

  @Test
  void getTopStocks_sortsByTradingValue() {
    StockTopListServiceImpl service = createService();

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "\uBC18\uB3C4\uCCB4", 5_919_637_922L);
    Stock naver = stock(2L, "035420", "NAVER", "Information Technology", "IT\uD50C\uB7AB\uD3FC / \uC18C\uD504\uD2B8\uC6E8\uC5B4", 164_263_395L);
    Stock hynix = stock(3L, "000660", "SK hynix", "Information Technology", "\uBC18\uB3C4\uCCB4", 728_002_365L);

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(naver, samsung, hynix));
    given(stockQuoteCacheService.getAll(any(), any())).willReturn(Map.of(
        "005930", quoteData("005930", 70_300, 2.15f, 1_000_000L),
        "035420", quoteData("035420", 200_000, 0.30f, 500_000L),
        "000660", quoteData("000660", 182_000, -1.75f, 700_000L)
    ));

    StockListResponse response = service.getTopStocks(null, null, null, null, "TRADING_VALUE", null, 0, 3);

    assertThat(response.stocks()).extracting(item -> item.ticker()).containsExactly("000660", "035420", "005930");
    assertThat(response.stocks()).extracting(item -> item.tradingValue())
        .containsExactly(127_400_000_000L, 100_000_000_000L, 70_300_000_000L);
  }

  @Test
  void getTopStocks_sortsByTradingVolume() {
    StockTopListServiceImpl service = createService();

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "\uBC18\uB3C4\uCCB4", 5_919_637_922L);
    Stock naver = stock(2L, "035420", "NAVER", "Information Technology", "IT\uD50C\uB7AB\uD3FC / \uC18C\uD504\uD2B8\uC6E8\uC5B4", 164_263_395L);
    Stock hynix = stock(3L, "000660", "SK hynix", "Information Technology", "\uBC18\uB3C4\uCCB4", 728_002_365L);

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(naver, samsung, hynix));
    given(stockQuoteCacheService.getAll(any(), any())).willReturn(Map.of(
        "005930", quoteData("005930", 70_300, 2.15f, 1_000_000L),
        "035420", quoteData("035420", 200_000, 0.30f, 500_000L),
        "000660", quoteData("000660", 182_000, -1.75f, 700_000L)
    ));

    StockListResponse response = service.getTopStocks(null, null, null, null, "TRADING_VOLUME", null, 0, 3);

    assertThat(response.stocks()).extracting(item -> item.ticker()).containsExactly("005930", "000660", "035420");
    assertThat(response.stocks()).extracting(item -> item.tradingVolume())
        .containsExactly(1_000_000L, 700_000L, 500_000L);
  }

  @Test
  void getTopStocks_sortsByDividendYield() {
    StockTopListServiceImpl service = createService();

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "\uBC18\uB3C4\uCCB4", 5_919_637_922L);
    Stock naver = stock(2L, "035420", "NAVER", "Information Technology", "IT\uD50C\uB7AB\uD3FC / \uC18C\uD504\uD2B8\uC6E8\uC5B4", 164_263_395L);
    Stock hynix = stock(3L, "000660", "SK hynix", "Information Technology", "\uBC18\uB3C4\uCCB4", 728_002_365L);

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(naver, samsung, hynix));
    given(stockQuoteCacheService.getAll(any(), any())).willReturn(Map.of(
        "005930", quoteData("005930", 70_300, 2.15f, 1_000_000L),
        "035420", quoteData("035420", 200_000, 0.30f, 500_000L),
        "000660", quoteData("000660", 182_000, -1.75f, 700_000L)
    ));
    given(stockDividendYieldSnapshotService.getLatestDividendYieldByStockIds(any()))
        .willReturn(Map.of(1L, 2.35f, 2L, 1.1f, 3L, 3.2f));

    StockListResponse response = service.getTopStocks(null, null, null, null, "DIVIDEND_YIELD", null, 0, 3);

    assertThat(response.stocks()).extracting(item -> item.ticker()).containsExactly("000660", "005930", "035420");
    assertThat(response.stocks()).extracting(item -> item.dividendYield())
        .containsExactly(3.2f, 2.35f, 1.1f);
  }

  @Test
  void getTopStocks_prefersRedisCacheOverDbDailyPrice() {
    StockTopListServiceImpl service = createService();

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "\uBC18\uB3C4\uCCB4", 5_919_637_922L);

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(samsung));
    given(stockQuoteCacheService.getAll(any(), any())).willReturn(Map.of(
        "005930", quoteData("005930", 70300, 2.15f, 1_000_000L)
    ));

    StockListResponse response = service.getTopStocks(null, null, null, null, "CHANGE", null, 0, 10);

    assertThat(response.stocks()).hasSize(1);
    assertThat(response.stocks().getFirst().price()).isEqualTo(70300);
    assertThat(response.stocks().getFirst().fluctuationRate()).isEqualTo(2.15f);
    assertThat(response.stocks().getFirst().tradingVolume()).isEqualTo(1_000_000L);
  }

  @Test
  void getTopStocks_appliesOffsetToDisplayRank() {
    StockTopListServiceImpl service = createService();

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "\uBC18\uB3C4\uCCB4", 5_919_637_922L);
    Stock naver = stock(2L, "035420", "NAVER", "Information Technology", "IT\uD50C\uB7AB\uD3FC / \uC18C\uD504\uD2B8\uC6E8\uC5B4", 164_263_395L);
    Stock hynix = stock(3L, "000660", "SK hynix", "Information Technology", "\uBC18\uB3C4\uCCB4", 728_002_365L);

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(naver, samsung, hynix));
    given(stockQuoteCacheService.getAll(any(), any())).willReturn(Map.of(
        "005930", quoteData("005930", 70000, 2.2f, 100000L),
        "035420", quoteData("035420", 200000, 0.3f, 50000L),
        "000660", quoteData("000660", 180000, -2.0f, 70000L)
    ));

    StockListResponse response = service.getTopStocks(null, null, null, null, "CHANGE", null, 1, 1);

    assertThat(response.stocks()).hasSize(1);
    assertThat(response.stocks().getFirst().rank()).isEqualTo(2);
  }

  @Test
  void getTopStocks_mergesDividendYieldFromSnapshot() {
    StockTopListServiceImpl service = createService();

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "\uBC18\uB3C4\uCCB4", 5_919_637_922L);

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(samsung));
    given(stockQuoteCacheService.getAll(any(), any())).willReturn(Map.of(
        "005930", quoteData("005930", 70000, 2.2f, 100000L)
    ));
    given(stockDividendYieldSnapshotService.getDividendYieldMap()).willReturn(Map.of("005930", 2.35f));
    given(stockDividendYieldSnapshotService.getLatestDividendYieldByStockIds(List.of(1L))).willReturn(Map.of());

    StockListResponse response = service.getTopStocks(null, null, null, null, "CHANGE", null, 0, 10);

    assertThat(response.stocks()).hasSize(1);
    assertThat(response.stocks().getFirst().dividendYield()).isEqualTo(2.35f);
  }

  @Test
  void getTopStocks_prefersLatestDbDividendYieldOverRedisSnapshot() {
    StockTopListServiceImpl service = createService();

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "\uBC18\uB3C4\uCCB4", 5_919_637_922L);

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(samsung));
    given(stockQuoteCacheService.getAll(any(), any())).willReturn(Map.of(
        "005930", quoteData("005930", 70000, 2.2f, 100000L)
    ));
    given(stockDividendYieldSnapshotService.getDividendYieldMap()).willReturn(Map.of("005930", 2.35f));
    given(stockDividendYieldSnapshotService.getLatestDividendYieldByStockIds(List.of(1L))).willReturn(Map.of(1L, 1.75f));

    StockListResponse response = service.getTopStocks(null, null, null, null, "CHANGE", null, 0, 10);

    assertThat(response.stocks()).hasSize(1);
    assertThat(response.stocks().getFirst().dividendYield()).isEqualTo(1.75f);
  }

  private KisQuoteData quoteData(String ticker, int price, float changeRate, long volume) {
    return new KisQuoteData(
        "J", ticker, "Stock " + ticker, price, price - 1000, 1000, changeRate,
        price - 500, price + 500, price - 800, volume,
        OffsetDateTime.now(ZoneId.of("Asia/Seoul")), "KIS"
    );
  }

  @Test
  void getTopStocks_resolvesIconUrlThroughResolver() {
    StockTopListServiceImpl service = createService();

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "\uBC18\uB3C4\uCCB4", 5_919_637_922L, "stock-icons/삼성전자_005930.png");

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(samsung));
    given(stockQuoteCacheService.getAll(any(), any())).willReturn(Map.of(
        "005930", quoteData("005930", 70000, 2.2f, 100000L)
    ));
    given(stockIconUrlResolver.resolve("stock-icons/삼성전자_005930.png"))
        .willReturn("https://cdn.example.com/assets/stock-icons/삼성전자_005930.png");

    StockListResponse response = service.getTopStocks(null, null, null, null, "CHANGE", null, 0, 10);

    assertThat(response.stocks().get(0).iconUrl())
        .isEqualTo("https://cdn.example.com/assets/stock-icons/삼성전자_005930.png");
  }

  private Stock stock(
      Long id,
      String ticker,
      String name,
      String gicsSector,
      String category,
      Long outstandingShares
  ) {
    return stock(id, ticker, name, gicsSector, category, outstandingShares, null);
  }

  private Stock stock(
      Long id,
      String ticker,
      String name,
      String gicsSector,
      String category,
      Long outstandingShares,
      String iconUrl
  ) {
    Stock stock = mock(Stock.class);
    given(stock.getId()).willReturn(id);
    given(stock.getTicker()).willReturn(ticker);
    given(stock.getName()).willReturn(name);
    given(stock.getCategory()).willReturn(category);
    given(stock.getOutstandingShares()).willReturn(outstandingShares);
    given(stock.getIconUrl()).willReturn(iconUrl);
    return stock;
  }

  private StockPriceDaily dailyPrice(Long stockId, Integer closePrice, Float fluctuationRate, Long volume) {
    StockPriceDaily stockPriceDaily = mock(StockPriceDaily.class);
    given(stockPriceDaily.getStockId()).willReturn(stockId);
    given(stockPriceDaily.getClosePrice()).willReturn(closePrice);
    given(stockPriceDaily.getFluctuationRate()).willReturn(fluctuationRate);
    given(stockPriceDaily.getVolume()).willReturn(volume);
    return stockPriceDaily;
  }
}
