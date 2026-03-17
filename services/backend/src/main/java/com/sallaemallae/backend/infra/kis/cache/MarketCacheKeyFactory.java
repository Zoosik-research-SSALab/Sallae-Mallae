package com.sallaemallae.backend.infra.kis.cache;

import com.sallaemallae.backend.infra.kis.KisProperties;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MarketCacheKeyFactory {

  private final KisProperties properties;

  public String accessToken() {
    return "KIS:AUTH:ACCESS:%s".formatted(modeNamespace());
  }

  public String approvalKey() {
    return "KIS:AUTH:APPROVAL:%s".formatted(modeNamespace());
  }

  public String quote(String marketCode, String ticker) {
    return "KIS:QUOTE:%s:%s:V1".formatted(marketCode, ticker);
  }

  public String topInterest(String marketCode, int maxItems) {
    return "KIS:TOP_INTEREST:%s:%s:V1".formatted(marketCode, maxItems);
  }

  public String topInterestStale(String marketCode, int maxItems) {
    return "KIS:TOP_INTEREST:STALE:%s:%s:V1".formatted(marketCode, maxItems);
  }

  public String realtimeTick(String marketCode, String ticker) {
    return "KIS:WS:TICK:%s:%s:V1".formatted(marketCode, ticker);
  }

  public String realtimeMinuteCurrent(String marketCode, String ticker) {
    return "KIS:WS:MINUTE:CURRENT:%s:%s:V1".formatted(marketCode, ticker);
  }

  public String realtimeMinuteRecent(String marketCode, String ticker) {
    return "KIS:WS:MINUTE:RECENT:%s:%s:V1".formatted(marketCode, ticker);
  }

  public String period(
      String marketCode,
      String ticker,
      String periodCode,
      LocalDate startDate,
      LocalDate endDate,
      boolean adjusted
  ) {
    return "KIS:PERIOD:%s:%s:%s:%s:%s:%s:V1"
        .formatted(marketCode, ticker, periodCode, startDate, endDate, adjusted);
  }

  private String modeNamespace() {
    return properties.isProdMode() ? "PROD" : "PAPER";
  }
}
