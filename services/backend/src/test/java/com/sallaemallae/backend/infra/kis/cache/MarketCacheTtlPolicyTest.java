package com.sallaemallae.backend.infra.kis.cache;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Set;
import org.junit.jupiter.api.Test;

class MarketCacheTtlPolicyTest {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");

  @Test
  void quoteTtl_usesShortTtlDuringOpenMarket() {
    Clock openClock = Clock.fixed(Instant.parse("2026-03-16T01:00:00Z"), ZONE_ID);
    MarketCacheTtlPolicy policy = new MarketCacheTtlPolicy(openClock, Set.of());

    assertThat(policy.quoteTtl().toSeconds()).isEqualTo(5);
  }

  @Test
  void quoteTtl_usesLongTtlOnConfiguredHoliday() {
    Clock holidayClock = Clock.fixed(Instant.parse("2026-03-16T01:00:00Z"), ZONE_ID);
    MarketCacheTtlPolicy policy = new MarketCacheTtlPolicy(
        holidayClock,
        Set.of(LocalDate.of(2026, 3, 16))
    );

    assertThat(policy.quoteTtl().toSeconds()).isEqualTo(60);
  }

  @Test
  void topInterestStaleTtl_isLongerDuringOpenMarket() {
    Clock openClock = Clock.fixed(Instant.parse("2026-03-16T01:00:00Z"), ZONE_ID);
    MarketCacheTtlPolicy policy = new MarketCacheTtlPolicy(openClock, Set.of());

    assertThat(policy.topInterestStaleTtl().toMinutes()).isEqualTo(30);
  }

  @Test
  void topInterestStaleTtl_isLongerOutsideMarketHours() {
    Clock closedClock = Clock.fixed(Instant.parse("2026-03-16T12:00:00Z"), ZONE_ID);
    MarketCacheTtlPolicy policy = new MarketCacheTtlPolicy(closedClock, Set.of());

    assertThat(policy.topInterestStaleTtl().toHours()).isEqualTo(6);
  }
}
