package com.sallaemallae.backend.domain.stock.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import com.sallaemallae.backend.domain.stock.dto.StockListResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.user.entity.UserWatchlist;
import com.sallaemallae.backend.domain.user.entity.UserWatchlistId;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import com.sallaemallae.backend.infra.kis.stock.KisDomesticStockClient;
import com.sallaemallae.backend.infra.kis.stock.KisTopInterestStockData;
import com.sallaemallae.backend.infra.kis.stock.KisTopInterestStockItem;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class StockTopListServiceImplTest {

  @Mock
  private KisDomesticStockClient kisDomesticStockClient;

  @Mock
  private StockRepository stockRepository;

  @Mock
  private WatchlistRepository watchlistRepository;

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void getTopStocks_returnsPaginatedListAndCounts() {
    StockTopListServiceImpl service = new StockTopListServiceImpl(
        kisDomesticStockClient,
        stockRepository,
        watchlistRepository
    );

    given(kisDomesticStockClient.getTopInterestStocks("J", 200)).willReturn(new KisTopInterestStockData(
        "J",
        OffsetDateTime.parse("2026-03-13T10:00:00+09:00"),
        List.of(
            new KisTopInterestStockItem(1, "005930", "삼성전자", 70000, 1500, "2", 2.2f, 100000L, 7000000000L, 70000, 69900, 321),
            new KisTopInterestStockItem(2, "035420", "NAVER", 200000, 200, "3", 0.3f, 50000L, 10000000000L, 200100, 199900, 280),
            new KisTopInterestStockItem(3, "000660", "SK하이닉스", 180000, -3600, "5", -2.0f, 70000L, 12600000000L, 180100, 179900, 250)
        ),
        "KIS"
    ));
    Stock samsung = stock(1L, "005930", "삼성전자", "Information Technology", "Semiconductor", 5_919_637_922L);
    Stock naver = stock(2L, "035420", "NAVER", "Information Technology", "Internet", 164_263_395L);
    Stock hynix = stock(3L, "000660", "SK하이닉스", "Information Technology", "Semiconductor", 728_002_365L);
    given(stockRepository.findAllByTickerInAndIsActiveTrue(List.of("005930", "035420", "000660")))
        .willReturn(List.of(samsung, naver, hynix));
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(99L, null, List.of())
    );
    UserWatchlist samsungWatchlist = watchlist(99L, 1L);
    given(watchlistRepository.findAllByIdUserId(99L))
        .willReturn(List.of(samsungWatchlist));

    StockListResponse response = service.getTopStocks(null, null, null, "CHANGE", null, 0, 2);

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
        kisDomesticStockClient,
        stockRepository,
        watchlistRepository
    );

    given(kisDomesticStockClient.getTopInterestStocks("J", 200)).willReturn(new KisTopInterestStockData(
        "J",
        OffsetDateTime.parse("2026-03-13T10:00:00+09:00"),
        List.of(new KisTopInterestStockItem(1, "005930", "삼성전자", 70000, 1500, "2", 2.2f, 100000L, 7000000000L, 70000, 69900, 321)),
        "KIS"
    ));
    Stock samsung = stock(1L, "005930", "삼성전자", "Information Technology", "Semiconductor", 5_919_637_922L);
    given(stockRepository.findAllByTickerInAndIsActiveTrue(List.of("005930")))
        .willReturn(List.of(samsung));

    StockListResponse response = service.getTopStocks("BUY", "IT", "LARGE", "MARKET_CAP", "삼성", 0, 10);

    assertThat(response.filterCounts().buy()).isEqualTo(1);
    assertThat(response.stocks()).hasSize(1);
    assertThat(response.stocks().get(0).isWatchlisted()).isFalse();
    verifyNoInteractions(watchlistRepository);
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

  private UserWatchlist watchlist(Long userId, Long stockId) {
    UserWatchlist watchlist = mock(UserWatchlist.class);
    given(watchlist.getId()).willReturn(new UserWatchlistId(userId, stockId));
    return watchlist;
  }
}
