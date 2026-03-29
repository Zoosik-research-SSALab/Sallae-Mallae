package com.sallaemallae.backend.infra.kis.cache;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.sallaemallae.backend.infra.kis.KisProperties;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class MarketCacheKeyFactoryTest {

  private final KisProperties kisProperties = Mockito.mock(KisProperties.class);
  private final MarketCacheKeyFactory keyFactory = new MarketCacheKeyFactory(kisProperties);

  @Test
  void buildsStableKeys() {
    given(kisProperties.isProdMode()).willReturn(false);

    assertThat(keyFactory.accessToken()).isEqualTo("KIS:AUTH:ACCESS:PAPER");
    assertThat(keyFactory.approvalKey()).isEqualTo("KIS:AUTH:APPROVAL:PAPER");
    assertThat(keyFactory.quote("J", "005930")).isEqualTo("KIS:QUOTE:J:005930:V1");
    assertThat(keyFactory.period("J", "005930", "D", LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 12), true))
        .isEqualTo("KIS:PERIOD:J:005930:D:2026-03-01:2026-03-12:true:V1");
  }
}
