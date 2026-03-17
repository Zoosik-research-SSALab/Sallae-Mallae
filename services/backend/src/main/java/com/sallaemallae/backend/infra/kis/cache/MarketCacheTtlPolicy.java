package com.sallaemallae.backend.infra.kis.cache;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MarketCacheTtlPolicy {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");
  private static final LocalTime MARKET_OPEN = LocalTime.of(9, 0);
  private static final LocalTime MARKET_CLOSE = LocalTime.of(15, 30);
  private static final DateTimeFormatter BASIC_DATE = DateTimeFormatter.BASIC_ISO_DATE;

  private final Clock clock;
  private final Set<LocalDate> marketHolidays;

  @Autowired
  public MarketCacheTtlPolicy(@Value("${KIS_MARKET_HOLIDAYS:}") String rawMarketHolidays) {
    this(Clock.system(ZONE_ID), parseHolidays(rawMarketHolidays));
  }

  public MarketCacheTtlPolicy(Clock clock, Set<LocalDate> marketHolidays) {
    this.clock = clock;
    this.marketHolidays = marketHolidays == null ? Set.of() : Set.copyOf(marketHolidays);
  }

  public Duration quoteTtl() {
    return isMarketOpen() ? Duration.ofSeconds(5) : Duration.ofSeconds(60);
  }

  public Duration topInterestTtl() {
    return isMarketOpen() ? Duration.ofSeconds(10) : Duration.ofSeconds(60);
  }

  public Duration topInterestStaleTtl() {
    return isMarketOpen() ? Duration.ofMinutes(5) : Duration.ofMinutes(30);
  }

  public Duration periodTtl(LocalDate endDate) {
    LocalDate today = ZonedDateTime.now(clock).withZoneSameInstant(ZONE_ID).toLocalDate();
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

  public Duration realtimeStateTtl() {
    return Duration.ofMinutes(30);
  }

  private boolean isMarketOpen() {
    ZonedDateTime now = ZonedDateTime.now(clock).withZoneSameInstant(ZONE_ID);
    LocalDate today = now.toLocalDate();
    DayOfWeek day = now.getDayOfWeek();
    if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY || marketHolidays.contains(today)) {
      return false;
    }
    LocalTime time = now.toLocalTime();
    return !time.isBefore(MARKET_OPEN) && !time.isAfter(MARKET_CLOSE);
  }

  private static Set<LocalDate> parseHolidays(String rawMarketHolidays) {
    if (rawMarketHolidays == null || rawMarketHolidays.isBlank()) {
      return Set.of();
    }
    return Arrays.stream(rawMarketHolidays.split(","))
        .map(String::trim)
        .filter(value -> !value.isBlank())
        .map(MarketCacheTtlPolicy::parseHoliday)
        .collect(Collectors.toUnmodifiableSet());
  }

  private static LocalDate parseHoliday(String rawValue) {
    if (rawValue.contains("-")) {
      return LocalDate.parse(rawValue);
    }
    return LocalDate.parse(rawValue, BASIC_DATE);
  }
}
