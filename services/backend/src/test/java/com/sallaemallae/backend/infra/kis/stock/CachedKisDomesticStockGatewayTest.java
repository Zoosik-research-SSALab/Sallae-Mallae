package com.sallaemallae.backend.infra.kis.stock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

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
    given(cacheRepository.get("KIS:TOP_INTEREST:J:200:V1", KisTopInterestStockData.class))
        .willReturn(Optional.empty());
    given(kisDomesticStockClient.getTopInterestStocks("J", 200)).willReturn(fresh);
    given(ttlPolicy.topInterestTtl()).willReturn(Duration.ofSeconds(10));

    var result = gateway.getTopInterestStocks("J", 200);

    assertThat(result.cacheHit()).isFalse();
    assertThat(result.value()).isSameAs(fresh);
    verify(cacheRepository).put("KIS:TOP_INTEREST:J:200:V1", fresh, Duration.ofSeconds(10));
  }
}
