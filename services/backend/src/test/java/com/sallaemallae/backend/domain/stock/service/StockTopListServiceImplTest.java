package com.sallaemallae.backend.domain.stock.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
import com.sallaemallae.backend.infra.kis.stock.KisTopInterestStockData;
import com.sallaemallae.backend.infra.kis.stock.KisTopInterestStockItem;
import java.time.OffsetDateTime;
import java.util.List;
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

  @Test
  void getTopStocks_returnsPaginatedListAndCounts() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService
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
        watchlistService
    );

    given(cachedKisDomesticStockGateway.getTopInterestStocks("J", 200)).willReturn(new CachedResult<>(
        "KIS:TOP_INTEREST:J:200:V1",
        true,
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

    StockListResponse response = service.getTopStocks(null, "BUY", "IT", "LARGE", "MARKET_CAP", "samsung", 0, 10);

    assertThat(response.filterCounts().buy()).isEqualTo(1);
    assertThat(response.stocks()).hasSize(1);
    assertThat(response.stocks().get(0).isWatchlisted()).isFalse();
    verifyNoInteractions(watchlistService);
  }

  @Test
  void getTopStocks_throwsBusinessExceptionWhenPaginationIsInvalid() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        cachedKisDomesticStockGateway,
        stockRepository,
        stockPriceDailyRepository,
        watchlistService
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
        watchlistService
    );

    given(cachedKisDomesticStockGateway.getTopInterestStocks("J", 200))
        .willThrow(new KisApiException(502, "KIS_HTTP_ERROR", "실시간 시세 데이터를 불러오지 못했습니다."));

    Stock samsung = stock(1L, "005930", "Samsung Electronics", "Information Technology", "Semiconductor", 5_919_637_922L);
    Stock hynix = stock(2L, "000660", "SK hynix", "Information Technology", "Semiconductor", 728_002_365L);
    StockPriceDaily samsungPrice = dailyPrice(1L, 70300, 2.15f);
    StockPriceDaily hynixPrice = dailyPrice(2L, 182000, -1.75f);

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

  private StockPriceDaily dailyPrice(Long stockId, Integer closePrice, Float fluctuationRate) {
    StockPriceDaily stockPriceDaily = mock(StockPriceDaily.class);
    given(stockPriceDaily.getStockId()).willReturn(stockId);
    given(stockPriceDaily.getClosePrice()).willReturn(closePrice);
    given(stockPriceDaily.getFluctuationRate()).willReturn(fluctuationRate);
    return stockPriceDaily;
  }
}
