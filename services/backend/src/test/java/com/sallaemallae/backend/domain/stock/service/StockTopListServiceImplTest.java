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
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.user.service.WatchlistService;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.infra.kis.KisApiException;
import com.sallaemallae.backend.infra.kis.cache.CachedResult;
import com.sallaemallae.backend.infra.kis.stock.CachedKisDomesticStockGateway;
import com.sallaemallae.backend.infra.kis.stock.KisQuoteData;
import com.sallaemallae.backend.infra.kis.stock.KisTopInterestStockData;
import com.sallaemallae.backend.infra.kis.stock.KisTopInterestStockItem;
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
  private CachedKisDomesticStockGateway cachedKisDomesticStockGateway;

  @Mock
  private StockRepository stockRepository;

  @Mock
  private StockPriceDailyRepository stockPriceDailyRepository;

  @Mock
  private WatchlistService watchlistService;

  @Mock
  private StockDividendYieldSnapshotService stockDividendYieldSnapshotService;

  @Test
  void getTopStocks_returnsPaginatedListAndCounts() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService,
        stockDividendYieldSnapshotService
    );

    given(cachedKisDomesticStockGateway.getTopInterestStocks("J", 200)).willReturn(new CachedResult<>(
        "KIS:TOP_INTEREST:J:200:V1",
        false,
        new KisTopInterestStockData(
            "J",
            OffsetDateTime.parse("2026-03-13T10:00:00+09:00"),
            List.of(
                new KisTopInterestStockItem(1, "005930", "Samsung Electronics", 70000, 1500, "2", 2.2f, 100000L, 7000000000L, 70000, 69900, 321),
                new KisTopInterestStockItem(2, "035420", "NAVER", 200000, 200, "3", 0.3f, 50000L, 10000000000L, 200100, 199900, 280),
                new KisTopInterestStockItem(3, "000660", "SK hynix", 180000, -3600, "5", -2.0f, 70000L, 12600000000L, 180100, 179900, 250)
            ),
            "KIS"
        )
    ));
    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "Semiconductor", 5_919_637_922L);
    Stock naver = stock(2L, "035420", "NAVER", "Information Technology", "Internet", 164_263_395L);
    Stock hynix = stock(3L, "000660", "SK hynix", "Information Technology", "Semiconductor", 728_002_365L);
    given(stockRepository.findAllByTickerInAndIsActiveTrue(List.of("005930", "035420", "000660")))
        .willReturn(List.of(samsung, naver, hynix));
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
  }

  @Test
  void getTopStocks_skipsWatchlistLookupWhenUnauthenticated() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService,
        stockDividendYieldSnapshotService
    );

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "Semiconductor", 5_919_637_922L);
    StockPriceDaily samsungPrice = dailyPrice(1L, 70300, 2.15f, 1_000_000L);
    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(samsung));
    given(stockPriceDailyRepository.findLatestByStockIdIn(List.of(1L))).willReturn(List.of(samsungPrice));

    StockListResponse response = service.getTopStocks(null, "BUY", "IT", "LARGE", "MARKET_CAP", "samsung", 0, 10);

    assertThat(response.filterCounts().buy()).isEqualTo(1);
    assertThat(response.stocks()).hasSize(1);
    assertThat(response.stocks().get(0).isWatchlisted()).isFalse();
    assertThat(response.stocks().get(0).tradingVolume()).isEqualTo(1_000_000L);
    assertThat(response.stocks().get(0).tradingValue()).isEqualTo(70_300_000_000L);
    verifyNoInteractions(watchlistService);
  }

  @Test
  void getTopStocks_throwsBusinessExceptionWhenPaginationIsInvalid() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService,
        stockDividendYieldSnapshotService
    );

    assertThatThrownBy(() -> service.getTopStocks(null, null, null, null, null, null, -1, 2))
        .isInstanceOfSatisfying(BusinessException.class, exception ->
            assertThat(exception.getErrorCode()).isEqualTo(StockErrorCode.STOCK_MARKET_INPUT_INVALID)
        );
  }

  @Test
  void getTopStocks_returnsLocalFallbackWhenKisRankingFails() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService,
        stockDividendYieldSnapshotService
    );

    given(cachedKisDomesticStockGateway.getTopInterestStocks("J", 200))
        .willThrow(new KisApiException(502, "KIS_HTTP_ERROR", "failed"));

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "Semiconductor", 5_919_637_922L);
    Stock hynix = stock(2L, "000660", "SK hynix", "Information Technology", "Semiconductor", 728_002_365L);
    StockPriceDaily samsungPrice = dailyPrice(1L, 70300, 2.15f, 1_000_000L);
    StockPriceDaily hynixPrice = dailyPrice(2L, 182000, -1.75f, 700_000L);

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(hynix, samsung));
    given(stockPriceDailyRepository.findLatestByStockIdIn(List.of(2L, 1L)))
        .willReturn(List.of(samsungPrice, hynixPrice));
    given(watchlistService.getWatchlistedStockIds(99L)).willReturn(Set.of(1L));

    StockListResponse response = service.getTopStocks(99L, null, null, null, "CHANGE", null, 0, 2);

    assertThat(response.filterCounts().buy()).isEqualTo(1);
    assertThat(response.filterCounts().sell()).isEqualTo(1);
    assertThat(response.filterCounts().hold()).isEqualTo(0);
    assertThat(response.stocks()).extracting(item -> item.ticker()).containsExactly("005930", "000660");
    assertThat(response.stocks().get(0).isWatchlisted()).isTrue();
  }

  @Test
  void getTopStocks_countsFallbackSignalsFromAllFilteredCandidatesNotVisiblePageOnly() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService,
        stockDividendYieldSnapshotService
    );

    given(cachedKisDomesticStockGateway.getTopInterestStocks("J", 200))
        .willThrow(new KisApiException(502, "KIS_HTTP_ERROR", "failed"));

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "Semiconductor", 5_919_637_922L);
    Stock hynix = stock(2L, "000660", "SK hynix", "Information Technology", "Semiconductor", 728_002_365L);
    StockPriceDaily samsungPrice = dailyPrice(1L, 70300, 2.15f, 1_000_000L);
    StockPriceDaily hynixPrice = dailyPrice(2L, 182000, -1.75f, 700_000L);

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(hynix, samsung));
    given(stockPriceDailyRepository.findLatestByStockIdIn(List.of(2L, 1L)))
        .willReturn(List.of(samsungPrice, hynixPrice));

    StockListResponse response = service.getTopStocks(null, null, null, null, "CHANGE", null, 0, 1);

    assertThat(response.filterCounts().buy()).isEqualTo(1);
    assertThat(response.filterCounts().sell()).isEqualTo(1);
    assertThat(response.filterCounts().hold()).isEqualTo(0);
    assertThat(response.stocks()).hasSize(1);
  }

  @Test
  void getTopStocks_capsLimitAtThirty() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService,
        stockDividendYieldSnapshotService
    );

    List<KisTopInterestStockItem> items = new ArrayList<>();
    List<Stock> stocks = new ArrayList<>();
    for (int i = 1; i <= 40; i++) {
      String ticker = "%06d".formatted(i);
      items.add(new KisTopInterestStockItem(i, ticker, "Stock " + i, 1000 + i, 10, "2", 1.0f, 1000L, 10000L, 1000 + i, 999 + i, i));
      stocks.add(stock((long) i, ticker, "Stock " + i, "Information Technology", "Category", 1_000_000L));
    }

    given(cachedKisDomesticStockGateway.getTopInterestStocks("J", 200))
        .willReturn(new CachedResult<>(
            "KIS:TOP_INTEREST:J:200:V1",
            false,
            new KisTopInterestStockData("J", OffsetDateTime.parse("2026-03-17T15:00:00+09:00"), items, "KIS")
        ));
    given(stockRepository.findAllByTickerInAndIsActiveTrue(any())).willReturn(stocks);

    StockListResponse response = service.getTopStocks(null, null, null, null, "CHANGE", null, 0, 50);

    assertThat(response.stocks()).hasSize(30);
  }

  @Test
  void getTopStocks_usesLocalUniverseForMarketCapSortAndAcceptsAllSector() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService,
        stockDividendYieldSnapshotService
    );

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "Semiconductor", 5_919_637_922L);
    Stock naver = stock(2L, "035420", "NAVER", "Information Technology", "Internet", 164_263_395L);
    Stock hynix = stock(3L, "000660", "SK hynix", "Information Technology", "Semiconductor", 728_002_365L);
    StockPriceDaily samsungPrice = dailyPrice(1L, 70300, 2.15f, 1_000_000L);
    StockPriceDaily naverPrice = dailyPrice(2L, 200000, 0.30f, 500_000L);
    StockPriceDaily hynixPrice = dailyPrice(3L, 182000, -1.75f, 700_000L);

    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(naver, samsung, hynix));
    given(stockPriceDailyRepository.findLatestByStockIdIn(List.of(2L, 1L, 3L)))
        .willReturn(List.of(samsungPrice, naverPrice, hynixPrice));

    StockListResponse response = service.getTopStocks(null, null, "\uC804\uCCB4", null, "MARKET_CAP", null, 0, 3);

    assertThat(response.stocks()).extracting(item -> item.ticker()).containsExactly("005930", "000660", "035420");
    assertThat(response.stocks().getFirst().tradingValue()).isEqualTo(70_300_000_000L);
    verifyNoInteractions(cachedKisDomesticStockGateway);
  }

  @Test
  void getTopStocks_doesNotQuoteEnrichMarketCapResultsWhenDailyPriceIsMissing() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService,
        stockDividendYieldSnapshotService
    );

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "Semiconductor", 5_919_637_922L);
    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(samsung));
    given(stockPriceDailyRepository.findLatestByStockIdIn(List.of(1L))).willReturn(List.of());

    StockListResponse response = service.getTopStocks(null, null, null, null, "MARKET_CAP", null, 0, 10);

    assertThat(response.stocks()).hasSize(1);
    assertThat(response.stocks().getFirst().price()).isNull();
    assertThat(response.stocks().getFirst().signal()).isEqualTo("HOLD");
    assertThat(response.filterCounts().hold()).isEqualTo(1);
    verifyNoInteractions(cachedKisDomesticStockGateway);
  }

  @Test
  void getTopStocks_enrichesFallbackPageWithKisQuotesWhenDailyPriceMissing() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService,
        stockDividendYieldSnapshotService
    );

    given(cachedKisDomesticStockGateway.getTopInterestStocks("J", 200))
        .willThrow(new KisApiException(502, "KIS_HTTP_ERROR", "failed"));

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "Semiconductor", 5_919_637_922L);
    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(samsung));
    given(stockPriceDailyRepository.findLatestByStockIdIn(List.of(1L))).willReturn(List.of());
    given(cachedKisDomesticStockGateway.getQuote("J", "005930"))
        .willReturn(new CachedResult<>(
            "KIS:QUOTE:J:005930:V1",
            false,
            new KisQuoteData(
                "J",
                "005930",
                "Samsung Electronics",
                70300,
                68900,
                1400,
                2.03f,
                70000,
                70500,
                69800,
                1_000_000L,
                OffsetDateTime.now(ZoneId.of("Asia/Seoul")),
                "KIS"
            )
        ));

    StockListResponse response = service.getTopStocks(null, null, null, null, "CHANGE", null, 0, 30);

    assertThat(response.stocks()).hasSize(1);
    assertThat(response.stocks().getFirst().price()).isEqualTo(70300);
    assertThat(response.stocks().getFirst().fluctuationRate()).isEqualTo(2.03f);
    assertThat(response.filterCounts().buy()).isEqualTo(0);
    assertThat(response.filterCounts().hold()).isEqualTo(1);
  }

  @Test
  void getTopStocks_continuesFallbackQuoteEnrichmentWhenOneTickerFails() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService,
        stockDividendYieldSnapshotService
    );

    given(cachedKisDomesticStockGateway.getTopInterestStocks("J", 200))
        .willThrow(new KisApiException(502, "KIS_HTTP_ERROR", "failed"));

    Stock alpha = stock(1L, "000001", "Alpha", "Information Technology", "Semiconductor", 1_000_000L);
    Stock samsung = stock(2L, "005930", "Samsung Electronics", "Information Technology", "Semiconductor", 5_919_637_922L);
    given(stockRepository.findAllByIsActiveTrueOrderByNameAsc()).willReturn(List.of(alpha, samsung));
    given(stockPriceDailyRepository.findLatestByStockIdIn(List.of(1L, 2L))).willReturn(List.of());
    given(cachedKisDomesticStockGateway.getQuote("J", "000001"))
        .willThrow(new RuntimeException("temporary parse error"));
    given(cachedKisDomesticStockGateway.getQuote("J", "005930"))
        .willReturn(new CachedResult<>(
            "KIS:QUOTE:J:005930:V1",
            false,
            new KisQuoteData(
                "J",
                "005930",
                "Samsung Electronics",
                70300,
                68900,
                1400,
                2.03f,
                70000,
                70500,
                69800,
                1_000_000L,
                OffsetDateTime.now(ZoneId.of("Asia/Seoul")),
                "KIS"
            )
        ));

    StockListResponse response = service.getTopStocks(null, null, null, null, "CHANGE", null, 0, 30);

    assertThat(response.stocks()).hasSize(2);
    assertThat(response.stocks().get(0).ticker()).isEqualTo("000001");
    assertThat(response.stocks().get(0).price()).isNull();
    assertThat(response.stocks().get(1).ticker()).isEqualTo("005930");
    assertThat(response.stocks().get(1).price()).isEqualTo(70300);
  }

  @Test
  void getTopStocks_appliesOffsetToDisplayRank() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService,
        stockDividendYieldSnapshotService
    );

    given(cachedKisDomesticStockGateway.getTopInterestStocks("J", 200)).willReturn(new CachedResult<>(
        "KIS:TOP_INTEREST:J:200:V1",
        false,
        new KisTopInterestStockData(
            "J",
            OffsetDateTime.parse("2026-03-13T10:00:00+09:00"),
            List.of(
                new KisTopInterestStockItem(1, "005930", "Samsung Electronics", 70000, 1500, "2", 2.2f, 100000L, 7000000000L, 70000, 69900, 321),
                new KisTopInterestStockItem(2, "035420", "NAVER", 200000, 200, "3", 0.3f, 50000L, 10000000000L, 200100, 199900, 280),
                new KisTopInterestStockItem(3, "000660", "SK hynix", 180000, -3600, "5", -2.0f, 70000L, 12600000000L, 180100, 179900, 250)
            ),
            "KIS"
        )
    ));
    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "Semiconductor", 5_919_637_922L);
    Stock naver = stock(2L, "035420", "NAVER", "Information Technology", "Internet", 164_263_395L);
    Stock hynix = stock(3L, "000660", "SK hynix", "Information Technology", "Semiconductor", 728_002_365L);
    given(stockRepository.findAllByTickerInAndIsActiveTrue(List.of("005930", "035420", "000660")))
        .willReturn(List.of(samsung, naver, hynix));

    StockListResponse response = service.getTopStocks(null, null, null, null, "CHANGE", null, 1, 1);

    assertThat(response.stocks()).hasSize(1);
    assertThat(response.stocks().getFirst().rank()).isEqualTo(2);
  }

  @Test
  void getTopStocks_mergesDividendYieldFromSnapshot() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService,
        stockDividendYieldSnapshotService
    );

    given(stockDividendYieldSnapshotService.getDividendYieldMap()).willReturn(Map.of("005930", 2.35f));
    given(stockDividendYieldSnapshotService.getLatestDividendYieldByStockIds(List.of(1L))).willReturn(Map.of());
    given(cachedKisDomesticStockGateway.getTopInterestStocks("J", 200)).willReturn(new CachedResult<>(
        "KIS:TOP_INTEREST:J:200:V1",
        false,
        new KisTopInterestStockData(
            "J",
            OffsetDateTime.parse("2026-03-13T10:00:00+09:00"),
            List.of(new KisTopInterestStockItem(1, "005930", "Samsung Electronics", 70000, 1500, "2", 2.2f, 100000L, 7000000000L, 70000, 69900, 321)),
            "KIS"
        )
    ));
    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "Semiconductor", 5_919_637_922L);
    given(stockRepository.findAllByTickerInAndIsActiveTrue(List.of("005930")))
        .willReturn(List.of(samsung));

    StockListResponse response = service.getTopStocks(null, null, null, null, "CHANGE", null, 0, 10);

    assertThat(response.stocks()).hasSize(1);
    assertThat(response.stocks().getFirst().dividendYield()).isEqualTo(2.35f);
  }

  @Test
  void getTopStocks_prefersLatestDbDividendYieldOverRedisSnapshot() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService,
        stockDividendYieldSnapshotService
    );

    given(stockDividendYieldSnapshotService.getDividendYieldMap()).willReturn(Map.of("005930", 2.35f));
    given(stockDividendYieldSnapshotService.getLatestDividendYieldByStockIds(List.of(1L))).willReturn(Map.of(1L, 1.75f));
    given(cachedKisDomesticStockGateway.getTopInterestStocks("J", 200)).willReturn(new CachedResult<>(
        "KIS:TOP_INTEREST:J:200:V1",
        false,
        new KisTopInterestStockData(
            "J",
            OffsetDateTime.parse("2026-03-13T10:00:00+09:00"),
            List.of(new KisTopInterestStockItem(1, "005930", "Samsung Electronics", 70000, 1500, "2", 2.2f, 100000L, 7000000000L, 70000, 69900, 321)),
            "KIS"
        )
    ));
    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "Semiconductor", 5_919_637_922L);
    given(stockRepository.findAllByTickerInAndIsActiveTrue(List.of("005930")))
        .willReturn(List.of(samsung));

    StockListResponse response = service.getTopStocks(null, null, null, null, "CHANGE", null, 0, 10);

    assertThat(response.stocks()).hasSize(1);
    assertThat(response.stocks().getFirst().dividendYield()).isEqualTo(1.75f);
  }

  private Stock stock(
      Long id,
      String ticker,
      String name,
      String gicsSector,
      String category,
      Long outstandingShares
  ) {
    Stock stock = mock(Stock.class);
    given(stock.getId()).willReturn(id);
    given(stock.getTicker()).willReturn(ticker);
    given(stock.getName()).willReturn(name);
    given(stock.getGicsSector()).willReturn(gicsSector);
    given(stock.getCategory()).willReturn(category);
    given(stock.getOutstandingShares()).willReturn(outstandingShares);
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
