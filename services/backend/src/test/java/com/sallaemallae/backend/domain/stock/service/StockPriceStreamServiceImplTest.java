package com.sallaemallae.backend.domain.stock.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.sallaemallae.backend.domain.stock.dto.StockPricesResponse;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockPriceDaily;
import com.sallaemallae.backend.domain.stock.entity.StockPriceMinute;
import com.sallaemallae.backend.domain.stock.repository.StockPriceDailyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceMinuteRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceMonthlyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockPriceWeeklyRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeMinuteCandleAggregator;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeMinuteCandleData;
import com.sallaemallae.backend.infra.kis.websocket.KisWebSocketClient;
import com.sallaemallae.backend.infra.kis.websocket.KisWebSocketSubscriptionAck;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StockPriceStreamServiceImplTest {

  @Mock
  private StockRepository stockRepository;

  @Mock
  private StockPriceMinuteRepository stockPriceMinuteRepository;

  @Mock
  private StockPriceDailyRepository stockPriceDailyRepository;

  @Mock
  private StockPriceWeeklyRepository stockPriceWeeklyRepository;

  @Mock
  private StockPriceMonthlyRepository stockPriceMonthlyRepository;

  @Mock
  private KisProperties kisProperties;

  @Mock
  private KisWebSocketClient kisWebSocketClient;

  @Mock
  private KisRealtimeMinuteCandleAggregator candleAggregator;

  private StockPriceStreamServiceImpl service;

  @BeforeEach
  void setUp() {
    service = new StockPriceStreamServiceImpl(
        stockRepository,
        stockPriceMinuteRepository,
        stockPriceDailyRepository,
        stockPriceWeeklyRepository,
        stockPriceMonthlyRepository,
        kisProperties,
        kisWebSocketClient,
        candleAggregator
    );
  }

  @AfterEach
  void tearDown() {
    service.shutdown();
  }

  @Test
  void getLatestPrices_mergesRealtimeMinuteCandlesWhenConfigured() {
    Stock stock = stock(1L, "005930");
    OffsetDateTime minute0900 = OffsetDateTime.parse("2026-03-12T09:00:00+09:00");
    OffsetDateTime minute0901 = OffsetDateTime.parse("2026-03-12T09:01:00+09:00");
    OffsetDateTime minute0902 = OffsetDateTime.parse("2026-03-12T09:02:00+09:00");

    given(stockRepository.findByIdAndIsActiveTrue(1L)).willReturn(Optional.of(stock));
    given(kisProperties.isConfigured()).willReturn(true);
    given(kisWebSocketClient.subscribeDomesticTrade("J", "005930"))
        .willReturn(CompletableFuture.completedFuture(new KisWebSocketSubscriptionAck(
            "H0STCNT0",
            "005930",
            true,
            "OK",
            OffsetDateTime.parse("2026-03-12T09:00:10+09:00")
        )));
    given(candleAggregator.getCurrentMinuteCandle("J", "005930"))
        .willReturn(Optional.of(realtimeCandle(minute0902, 70150, 70350, 70100, 70300, 1500L, false)));
    given(candleAggregator.getRecentClosedMinuteCandles("J", "005930", 60))
        .willReturn(List.of(
            realtimeCandle(minute0901, 70050, 70250, 70000, 70200, 1300L, true),
            realtimeCandle(minute0900, 70000, 70120, 69980, 70080, 1100L, true)
        ));

    StockPricesResponse response = service.getLatestPrices(1L, "1MIN");

    assertThat(response.prices()).hasSize(3);
    assertThat(response.prices().get(0).timestamp()).isEqualTo(minute0900);
    assertThat(response.prices().get(1).timestamp()).isEqualTo(minute0901);
    assertThat(response.prices().get(1).close()).isEqualTo(70200);
    assertThat(response.prices().get(2).timestamp()).isEqualTo(minute0902);
    assertThat(response.prices().get(2).close()).isEqualTo(70300);
    verify(kisWebSocketClient).subscribeDomesticTrade("J", "005930");
    verifyNoInteractions(stockPriceMinuteRepository);
  }

  @Test
  void getLatestPrices_mergesRealtimeMinuteCandlesIntoDailyWindowWhenConfigured() {
    Stock stock = stock(1L, "005930");
    OffsetDateTime minute0900 = OffsetDateTime.parse("2026-03-12T09:00:00+09:00");
    OffsetDateTime minute0901 = OffsetDateTime.parse("2026-03-12T09:01:00+09:00");
    OffsetDateTime minute0902 = OffsetDateTime.parse("2026-03-12T09:02:00+09:00");
    StockPriceMinute dbMinute0901 = minutePrice(minute0901, 70050, 70200, 70000, 70150, 1200L);
    StockPriceMinute dbMinute0900 = minutePrice(minute0900, 70000, 70100, 69900, 70050, 1000L);

    given(stockRepository.findByIdAndIsActiveTrue(1L)).willReturn(Optional.of(stock));
    given(stockPriceMinuteRepository.findByStockIdOrderByTradeTimestampDesc(eq(1L), any()))
        .willReturn(List.of(dbMinute0901, dbMinute0900));
    given(kisProperties.isConfigured()).willReturn(true);
    given(kisWebSocketClient.subscribeDomesticTrade("J", "005930"))
        .willReturn(CompletableFuture.completedFuture(new KisWebSocketSubscriptionAck(
            "H0STCNT0",
            "005930",
            true,
            "OK",
            OffsetDateTime.parse("2026-03-12T09:00:10+09:00")
        )));
    given(candleAggregator.getCurrentMinuteCandle("J", "005930"))
        .willReturn(Optional.of(realtimeCandle(minute0902, 70150, 70350, 70100, 70300, 1500L, false)));
    given(candleAggregator.getRecentClosedMinuteCandles("J", "005930", 390))
        .willReturn(List.of(realtimeCandle(minute0901, 70050, 70250, 70000, 70200, 1300L, true)));

    StockPricesResponse response = service.getLatestPrices(1L, "1D");

    assertThat(response.prices()).hasSize(3);
    assertThat(response.prices().get(0).timestamp()).isEqualTo(minute0900);
    assertThat(response.prices().get(1).timestamp()).isEqualTo(minute0901);
    assertThat(response.prices().get(1).close()).isEqualTo(70200);
    assertThat(response.prices().get(2).timestamp()).isEqualTo(minute0902);
    assertThat(response.prices().get(2).close()).isEqualTo(70300);
  }

  @Test
  void getLatestPrices_doesNotTouchRealtimeForWeeklyPeriod() {
    Stock stock = stock(1L, "005930");
    StockPriceDaily daily1 = dailyPrice(LocalDate.of(2026, 3, 8), 70000, 70500, 69800, 70300, 100000L);
    StockPriceDaily daily2 = dailyPrice(LocalDate.of(2026, 3, 9), 70300, 70700, 70200, 70600, 120000L);

    given(stockRepository.findByIdAndIsActiveTrue(1L)).willReturn(Optional.of(stock));
    given(stockPriceDailyRepository.findByStockIdOrderByTradeDateDesc(eq(1L), any()))
        .willReturn(List.of(daily2, daily1));

    StockPricesResponse response = service.getLatestPrices(1L, "1W");

    assertThat(response.prices()).hasSize(2);
    assertThat(response.prices().get(0).timestamp())
        .isEqualTo(LocalDate.of(2026, 3, 8).atStartOfDay(java.time.ZoneOffset.ofHours(9)).toOffsetDateTime());
    assertThat(response.prices().get(1).timestamp())
        .isEqualTo(LocalDate.of(2026, 3, 9).atStartOfDay(java.time.ZoneOffset.ofHours(9)).toOffsetDateTime());
    verifyNoInteractions(kisProperties, kisWebSocketClient, candleAggregator);
  }

  private Stock stock(Long id, String ticker) {
    Stock stock = mock(Stock.class);
    given(stock.getId()).willReturn(id);
    given(stock.getTicker()).willReturn(ticker);
    return stock;
  }

  private StockPriceMinute minutePrice(
      OffsetDateTime tradeTimestamp,
      Integer openPrice,
      Integer highPrice,
      Integer lowPrice,
      Integer closePrice,
      Long volume
  ) {
    StockPriceMinute price = mock(StockPriceMinute.class);
    given(price.getTradeTimestamp()).willReturn(tradeTimestamp);
    given(price.getOpenPrice()).willReturn(openPrice);
    given(price.getHighPrice()).willReturn(highPrice);
    given(price.getLowPrice()).willReturn(lowPrice);
    given(price.getClosePrice()).willReturn(closePrice);
    given(price.getVolume()).willReturn(volume);
    return price;
  }

  private StockPriceDaily dailyPrice(
      LocalDate tradeDate,
      Integer openPrice,
      Integer highPrice,
      Integer lowPrice,
      Integer closePrice,
      Long volume
  ) {
    StockPriceDaily price = mock(StockPriceDaily.class);
    given(price.getTradeDate()).willReturn(tradeDate);
    given(price.getOpenPrice()).willReturn(openPrice);
    given(price.getHighPrice()).willReturn(highPrice);
    given(price.getLowPrice()).willReturn(lowPrice);
    given(price.getClosePrice()).willReturn(closePrice);
    given(price.getVolume()).willReturn(volume);
    return price;
  }

  private KisRealtimeMinuteCandleData realtimeCandle(
      OffsetDateTime bucketStart,
      Integer openPrice,
      Integer highPrice,
      Integer lowPrice,
      Integer closePrice,
      Long minuteVolume,
      boolean closed
  ) {
    return new KisRealtimeMinuteCandleData(
        "J",
        "005930",
        bucketStart,
        bucketStart.plusMinutes(1),
        openPrice,
        highPrice,
        lowPrice,
        closePrice,
        minuteVolume,
        minuteVolume,
        0.15f,
        3,
        bucketStart.plusSeconds(30),
        closed,
        "KIS_WS"
    );
  }
}
