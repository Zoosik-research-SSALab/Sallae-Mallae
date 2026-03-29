package com.sallaemallae.backend.infra.kis.stock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.sallaemallae.backend.infra.kis.KisApiException;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheKeyFactory;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheRepository;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheTtlPolicy;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CachedKisDomesticStockGatewayTest {

  @Mock
  private MarketCacheRepository cacheRepository;

  @Mock
  private MarketCacheKeyFactory cacheKeyFactory;

  @Mock
  private MarketCacheTtlPolicy ttlPolicy;

  @Mock
  private KisDomesticStockClient kisDomesticStockClient;

  @Test
  void getTopInterestStocks_returnsCachedValueOnCacheHit() {
    CachedKisDomesticStockGateway gateway = new CachedKisDomesticStockGateway(
        cacheRepository,
        cacheKeyFactory,
        ttlPolicy,
        kisDomesticStockClient
    );
    KisTopInterestStockData cached = new KisTopInterestStockData(
        "J",
        OffsetDateTime.parse("2026-03-16T10:00:00+09:00"),
        List.of(),
        "KIS"
    );

    given(cacheKeyFactory.topInterest("J", 200)).willReturn("KIS:TOP_INTEREST:J:200:V1");
    given(cacheKeyFactory.topInterestStale("J", 200)).willReturn("KIS:TOP_INTEREST:STALE:J:200:V1");
    given(cacheRepository.get("KIS:TOP_INTEREST:J:200:V1", KisTopInterestStockData.class))
        .willReturn(Optional.of(cached));

    var result = gateway.getTopInterestStocks("J", 200);

    assertThat(result.cacheHit()).isTrue();
    assertThat(result.value()).isSameAs(cached);
    verify(kisDomesticStockClient, never()).getTopInterestStocks("J", 200);
  }

  @Test
  void getTopInterestStocks_fetchesAndCachesOnCacheMiss() {
    CachedKisDomesticStockGateway gateway = new CachedKisDomesticStockGateway(
        cacheRepository,
        cacheKeyFactory,
        ttlPolicy,
        kisDomesticStockClient
    );
    KisTopInterestStockData fresh = new KisTopInterestStockData(
        "J",
        OffsetDateTime.parse("2026-03-16T10:00:00+09:00"),
        List.of(),
        "KIS"
    );

    given(cacheKeyFactory.topInterest("J", 200)).willReturn("KIS:TOP_INTEREST:J:200:V1");
    given(cacheKeyFactory.topInterestStale("J", 200)).willReturn("KIS:TOP_INTEREST:STALE:J:200:V1");
    given(cacheRepository.get("KIS:TOP_INTEREST:J:200:V1", KisTopInterestStockData.class))
        .willReturn(Optional.empty());
    given(kisDomesticStockClient.getTopInterestStocks("J", 200)).willReturn(fresh);
    given(ttlPolicy.topInterestTtl()).willReturn(Duration.ofSeconds(10));
    given(ttlPolicy.topInterestStaleTtl()).willReturn(Duration.ofMinutes(30));

    var result = gateway.getTopInterestStocks("J", 200);

    assertThat(result.cacheHit()).isFalse();
    assertThat(result.value()).isSameAs(fresh);
    verify(cacheRepository).put("KIS:TOP_INTEREST:J:200:V1", fresh, Duration.ofSeconds(10));
    verify(cacheRepository).put("KIS:TOP_INTEREST:STALE:J:200:V1", fresh, Duration.ofMinutes(30));
    verify(cacheRepository, never()).get("KIS:TOP_INTEREST:STALE:J:200:V1", KisTopInterestStockData.class);
  }

  @Test
  void getTopInterestStocks_returnsStaleCacheWhenFreshFetchFails() {
    CachedKisDomesticStockGateway gateway = new CachedKisDomesticStockGateway(
        cacheRepository,
        cacheKeyFactory,
        ttlPolicy,
        kisDomesticStockClient
    );
    KisTopInterestStockData stale = new KisTopInterestStockData(
        "J",
        OffsetDateTime.parse("2026-03-16T10:00:00+09:00"),
        List.of(),
        "KIS"
    );

    given(cacheKeyFactory.topInterest("J", 200)).willReturn("KIS:TOP_INTEREST:J:200:V1");
    given(cacheKeyFactory.topInterestStale("J", 200)).willReturn("KIS:TOP_INTEREST:STALE:J:200:V1");
    given(cacheRepository.get("KIS:TOP_INTEREST:J:200:V1", KisTopInterestStockData.class))
        .willReturn(Optional.empty());
    given(cacheRepository.get("KIS:TOP_INTEREST:STALE:J:200:V1", KisTopInterestStockData.class))
        .willReturn(Optional.of(stale));
    given(kisDomesticStockClient.getTopInterestStocks("J", 200))
        .willThrow(new KisApiException(502, "KIS_HTTP_ERROR", "실시간 시세 데이터를 불러오지 못했습니다."));

    var result = gateway.getTopInterestStocks("J", 200);

    assertThat(result.cacheHit()).isTrue();
    assertThat(result.cacheKey()).isEqualTo("KIS:TOP_INTEREST:STALE:J:200:V1");
    assertThat(result.value()).isSameAs(stale);
  }

  @Test
  void getTopInterestStocks_throwsWhenFreshFetchFailsAndNoStaleCacheExists() {
    CachedKisDomesticStockGateway gateway = new CachedKisDomesticStockGateway(
        cacheRepository,
        cacheKeyFactory,
        ttlPolicy,
        kisDomesticStockClient
    );

    given(cacheKeyFactory.topInterest("J", 200)).willReturn("KIS:TOP_INTEREST:J:200:V1");
    given(cacheKeyFactory.topInterestStale("J", 200)).willReturn("KIS:TOP_INTEREST:STALE:J:200:V1");
    given(cacheRepository.get("KIS:TOP_INTEREST:J:200:V1", KisTopInterestStockData.class))
        .willReturn(Optional.empty());
    given(cacheRepository.get("KIS:TOP_INTEREST:STALE:J:200:V1", KisTopInterestStockData.class))
        .willReturn(Optional.empty());
    given(kisDomesticStockClient.getTopInterestStocks("J", 200))
        .willThrow(new KisApiException(502, "KIS_HTTP_ERROR", "실시간 시세 데이터를 불러오지 못했습니다."));

    assertThatThrownBy(() -> gateway.getTopInterestStocks("J", 200))
        .isInstanceOf(KisApiException.class);
  }
}
