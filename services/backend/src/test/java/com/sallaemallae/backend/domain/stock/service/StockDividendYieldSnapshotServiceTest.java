package com.sallaemallae.backend.domain.stock.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockDividendYieldSnapshot;
import com.sallaemallae.backend.domain.stock.repository.StockDividendYieldSnapshotRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.infra.kis.KisProperties;
import com.sallaemallae.backend.infra.kis.cache.DividendYieldSnapshotRepository;
import com.sallaemallae.backend.infra.kis.cache.DividendYieldSnapshotRepository.DividendYieldSnapshot;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheTtlPolicy;
import com.sallaemallae.backend.infra.kis.stock.KisDividendRateData;
import com.sallaemallae.backend.infra.kis.stock.KisDividendRateItem;
import com.sallaemallae.backend.infra.kis.stock.KisDomesticStockClient;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StockDividendYieldSnapshotServiceTest {

  @Mock
  private KisProperties kisProperties;

  @Mock
  private KisDomesticStockClient kisDomesticStockClient;

  @Mock
  private DividendYieldSnapshotRepository snapshotRepository;

  @Mock
  private StockDividendYieldSnapshotRepository stockDividendYieldSnapshotRepository;

  @Mock
  private StockRepository stockRepository;

  @Test
  void getDividendYieldMap_returnsEmptyMapWhenSnapshotMissing() {
    MarketCacheTtlPolicy ttlPolicy = mock(MarketCacheTtlPolicy.class);
    StockDividendYieldSnapshotService service = new StockDividendYieldSnapshotService(
        kisProperties,
        kisDomesticStockClient,
        snapshotRepository,
        stockDividendYieldSnapshotRepository,
        stockRepository,
        ttlPolicy
    );

    given(snapshotRepository.getSnapshot()).willReturn(Optional.empty());

    assertThat(service.getDividendYieldMap()).isEmpty();
  }

  @Test
  void refreshSnapshot_keepsLatestRecordDatePerTicker() {
    MarketCacheTtlPolicy ttlPolicy = new MarketCacheTtlPolicy(
        Clock.fixed(OffsetDateTime.parse("2026-03-18T09:00:00+09:00").toInstant(), ZoneId.of("Asia/Seoul")),
        java.util.Set.of()
    );
    StockDividendYieldSnapshotService service = new StockDividendYieldSnapshotService(
        kisProperties,
        kisDomesticStockClient,
        snapshotRepository,
        stockDividendYieldSnapshotRepository,
        stockRepository,
        ttlPolicy
    );

    given(kisProperties.isConfigured()).willReturn(true);
    given(kisDomesticStockClient.getCashDividendRateRanking(eq("1"), eq("0001"), any(LocalDate.class), any(LocalDate.class)))
        .willReturn(new KisDividendRateData(
            "1",
            "0001",
            LocalDate.parse("2025-02-11"),
            LocalDate.parse("2026-03-18"),
            OffsetDateTime.parse("2026-03-18T09:00:00+09:00"),
            List.of(
                new KisDividendRateItem(5, "005930", LocalDate.parse("2025-12-30"), 2.10f, "cash"),
                new KisDividendRateItem(1, "005930", LocalDate.parse("2024-12-30"), 9.99f, "cash")
            ),
            "KIS"
        ));
    given(kisDomesticStockClient.getCashDividendRateRanking(eq("3"), eq("1001"), any(LocalDate.class), any(LocalDate.class)))
        .willReturn(new KisDividendRateData(
            "3",
            "1001",
            LocalDate.parse("2025-02-11"),
            LocalDate.parse("2026-03-18"),
            OffsetDateTime.parse("2026-03-18T09:00:00+09:00"),
            List.of(new KisDividendRateItem(3, "000660", LocalDate.parse("2025-12-30"), 1.45f, "cash")),
            "KIS"
        ));
    Stock samsung = mock(Stock.class);
    given(samsung.getId()).willReturn(1L);
    given(samsung.getTicker()).willReturn("005930");
    Stock hynix = mock(Stock.class);
    given(hynix.getId()).willReturn(2L);
    given(hynix.getTicker()).willReturn("000660");
    given(stockRepository.findAllByTickerInAndIsActiveTrue(any())).willReturn(List.of(samsung, hynix));
    given(stockDividendYieldSnapshotRepository.findAllByStockIdInAndIsLatestTrue(any())).willReturn(List.of());
    given(stockDividendYieldSnapshotRepository.findAllByStockIdInAndAsOfDateAndSource(any(), any(LocalDate.class), any()))
        .willReturn(List.of());

    service.refreshSnapshot();

    ArgumentCaptor<DividendYieldSnapshot> snapshotCaptor = ArgumentCaptor.forClass(DividendYieldSnapshot.class);
    verify(snapshotRepository).saveSnapshot(snapshotCaptor.capture(), eq(Duration.ofDays(8)));
    verify(stockDividendYieldSnapshotRepository).saveAllAndFlush(any());
    assertThat(snapshotCaptor.getValue().yields())
        .containsEntry("005930", 2.10f)
        .containsEntry("000660", 1.45f);
  }

  @Test
  void refreshSnapshot_doesNotWriteRedisWhenDbSyncFails() {
    MarketCacheTtlPolicy ttlPolicy = new MarketCacheTtlPolicy(
        Clock.fixed(OffsetDateTime.parse("2026-03-18T09:00:00+09:00").toInstant(), ZoneId.of("Asia/Seoul")),
        java.util.Set.of()
    );
    StockDividendYieldSnapshotService service = new StockDividendYieldSnapshotService(
        kisProperties,
        kisDomesticStockClient,
        snapshotRepository,
        stockDividendYieldSnapshotRepository,
        stockRepository,
        ttlPolicy
    );

    given(kisProperties.isConfigured()).willReturn(true);
    given(kisDomesticStockClient.getCashDividendRateRanking(eq("1"), eq("0001"), any(LocalDate.class), any(LocalDate.class)))
        .willReturn(new KisDividendRateData(
            "1",
            "0001",
            LocalDate.parse("2025-02-11"),
            LocalDate.parse("2026-03-18"),
            OffsetDateTime.parse("2026-03-18T09:00:00+09:00"),
            List.of(new KisDividendRateItem(1, "005930", LocalDate.parse("2025-12-30"), 2.10f, "cash")),
            "KIS"
        ));
    given(kisDomesticStockClient.getCashDividendRateRanking(eq("3"), eq("1001"), any(LocalDate.class), any(LocalDate.class)))
        .willReturn(new KisDividendRateData(
            "3",
            "1001",
            LocalDate.parse("2025-02-11"),
            LocalDate.parse("2026-03-18"),
            OffsetDateTime.parse("2026-03-18T09:00:00+09:00"),
            List.of(),
            "KIS"
        ));

    Stock samsung = mock(Stock.class);
    given(samsung.getId()).willReturn(1L);
    given(samsung.getTicker()).willReturn("005930");
    given(stockRepository.findAllByTickerInAndIsActiveTrue(any())).willReturn(List.of(samsung));
    given(stockDividendYieldSnapshotRepository.findAllByStockIdInAndIsLatestTrue(any())).willReturn(List.of());
    given(stockDividendYieldSnapshotRepository.findAllByStockIdInAndAsOfDateAndSource(any(), any(LocalDate.class), any()))
        .willReturn(List.of());
    given(stockDividendYieldSnapshotRepository.saveAllAndFlush(any())).willThrow(new RuntimeException("db write failed"));

    service.refreshSnapshot();

    verify(snapshotRepository, never()).saveSnapshot(any(), any());
  }

  @Test
  void getLatestDividendYieldByStockIds_returnsLatestDbValues() {
    MarketCacheTtlPolicy ttlPolicy = mock(MarketCacheTtlPolicy.class);
    StockDividendYieldSnapshotService service = new StockDividendYieldSnapshotService(
        kisProperties,
        kisDomesticStockClient,
        snapshotRepository,
        stockDividendYieldSnapshotRepository,
        stockRepository,
        ttlPolicy
    );

    given(stockDividendYieldSnapshotRepository.findAllByStockIdInAndIsLatestTrue(List.of(1L, 2L)))
        .willReturn(List.of(
            StockDividendYieldSnapshot.create(
                1L,
                LocalDate.parse("2026-03-18"),
                LocalDate.parse("2025-12-30"),
                2.1f,
                null,
                "cash",
                "KIS dividend-rate",
                LocalDate.parse("2025-02-11"),
                LocalDate.parse("2026-03-18"),
                OffsetDateTime.parse("2026-03-18T09:00:00+09:00"),
                true
            )
        ));

    assertThat(service.getLatestDividendYieldByStockIds(List.of(1L, 2L)))
        .containsEntry(1L, 2.1f);
  }
}
