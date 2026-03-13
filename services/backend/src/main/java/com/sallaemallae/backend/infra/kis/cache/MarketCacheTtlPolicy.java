package com.sallaemallae.backend.infra.kis.cache;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.springframework.stereotype.Component;

@Component
public class MarketCacheTtlPolicy {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");
  private static final LocalTime MARKET_OPEN = LocalTime.of(9, 0);
  private static final LocalTime MARKET_CLOSE = LocalTime.of(15, 30);

  public Duration quoteTtl() {
    return isMarketOpen() ? Duration.ofSeconds(5) : Duration.ofSeconds(60);
  }

  public Duration periodTtl(LocalDate endDate) {
    LocalDate today = ZonedDateTime.now(ZONE_ID).toLocalDate();
    return !endDate.isBefore(today) ? Duration.ofSeconds(30) : Duration.ofHours(6);
  }

  public Duration realtimeTickTtl() {
    return Duration.ofMinutes(15);
  }

  public Duration realtimeMinuteCurrentTtl() {
    return Duration.ofHours(6);
  }

  public Duration realtimeMinuteRecentTtl() {
    return Duration.ofDays(1);
  }

  private boolean isMarketOpen() {
    ZonedDateTime now = ZonedDateTime.now(ZONE_ID);
    DayOfWeek day = now.getDayOfWeek();
    if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) {
      return false;
    }
    LocalTime time = now.toLocalTime();
    return !time.isBefore(MARKET_OPEN) && !time.isAfter(MARKET_CLOSE);
  }
}
