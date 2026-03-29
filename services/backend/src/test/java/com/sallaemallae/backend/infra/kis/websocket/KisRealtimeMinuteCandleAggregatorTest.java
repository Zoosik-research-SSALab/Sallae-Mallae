package com.sallaemallae.backend.infra.kis.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sallaemallae.backend.infra.kis.cache.KisRealtimeCacheRepository;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheTtlPolicy;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class KisRealtimeMinuteCandleAggregatorTest {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");

  @Mock
  private KisRealtimeCacheRepository cacheRepository;

  private Clock clock;
  private KisRealtimeMinuteCandleAggregator aggregator;

  @BeforeEach
  void setUp() {
    clock = Clock.fixed(Instant.parse("2026-03-12T00:02:30Z"), ZONE_ID);
    aggregator = new KisRealtimeMinuteCandleAggregator(
        cacheRepository,
        new MarketCacheTtlPolicy(clock, Set.<LocalDate>of()),
        clock
    );
  }

  @Test
  void acceptTick_rollsMinuteAndPersistsClosedCandle() {
    when(cacheRepository.getCurrentMinuteCandle("J", "005930")).thenReturn(Optional.empty());
    when(cacheRepository.getRecentMinuteCandles("J", "005930")).thenReturn(List.of());

    aggregator.acceptTick(tick("2026-03-12T09:00:01+09:00", 70000, 10L, 100L));
    aggregator.acceptTick(tick("2026-03-12T09:00:30+09:00", 70100, 20L, 120L));
    aggregator.acceptTick(tick("2026-03-12T09:01:01+09:00", 70200, 5L, 125L));

    ArgumentCaptor<List<KisRealtimeMinuteCandleData>> captor = ArgumentCaptor.forClass(List.class);
    verify(cacheRepository).saveRecentMinuteCandles(eq("J"), eq("005930"), captor.capture(), any());

    List<KisRealtimeMinuteCandleData> persisted = captor.getValue();
    assertThat(persisted).hasSize(1);
    KisRealtimeMinuteCandleData closed = persisted.getFirst();
    assertThat(closed.bucketStart()).isEqualTo(OffsetDateTime.parse("2026-03-12T09:00:00+09:00"));
    assertThat(closed.openPrice()).isEqualTo(70000);
    assertThat(closed.highPrice()).isEqualTo(70100);
    assertThat(closed.lowPrice()).isEqualTo(70000);
    assertThat(closed.closePrice()).isEqualTo(70100);
    assertThat(closed.minuteVolume()).isEqualTo(30L);
    assertThat(closed.closed()).isTrue();
  }

  @Test
  void getCurrentMinuteCandle_returnsAggregatedCurrentMinute() {
    when(cacheRepository.getCurrentMinuteCandle("J", "005930")).thenReturn(Optional.empty());

    OffsetDateTime tradedAt = OffsetDateTime.parse("2026-03-12T09:02:01+09:00");
    aggregator.acceptTick(tick(tradedAt.toString(), 70300, 7L, 200L));

    KisRealtimeMinuteCandleData current = aggregator.getCurrentMinuteCandle("J", "005930").orElseThrow();
    assertThat(current.bucketStart()).isEqualTo(OffsetDateTime.parse("2026-03-12T09:02:00+09:00"));
    assertThat(current.closePrice()).isEqualTo(70300);
    assertThat(current.minuteVolume()).isEqualTo(7L);
    assertThat(current.closed()).isFalse();
  }

  @Test
  void getCurrentMinuteCandle_rollsExpiredCurrentIntoClosedList() {
    OffsetDateTime bucketStart = OffsetDateTime.parse("2026-03-12T09:00:00+09:00");
    KisRealtimeMinuteCandleData expired = new KisRealtimeMinuteCandleData(
        "J",
        "005930",
        bucketStart,
        bucketStart.plusMinutes(1),
        70000,
        70100,
        69900,
        70050,
        15L,
        100L,
        0.14f,
        2,
        bucketStart.plusSeconds(45),
        false,
        "KIS_WS"
    );

    when(cacheRepository.getCurrentMinuteCandle("J", "005930")).thenReturn(Optional.of(expired));
    when(cacheRepository.getRecentMinuteCandles("J", "005930")).thenReturn(List.of());

    Optional<KisRealtimeMinuteCandleData> current = aggregator.getCurrentMinuteCandle("J", "005930");

    assertThat(current).isEmpty();
    verify(cacheRepository).saveRecentMinuteCandles(eq("J"), eq("005930"), any(), any());
    verify(cacheRepository).deleteCurrentMinuteCandle("J", "005930");
  }

  private KisRealtimeTradeTickData tick(String tradedAt, int price, long tradeVolume, long accumulatedVolume) {
    return new KisRealtimeTradeTickData(
        "J",
        "005930",
        OffsetDateTime.parse(tradedAt).withOffsetSameInstant(ZoneOffset.ofHours(9)),
        price,
        price - 300,
        price + 500,
        price - 800,
        100,
        0.14f,
        tradeVolume,
        accumulatedVolume,
        100f,
        "20",
        false,
        "KIS_WS"
    );
  }
}
