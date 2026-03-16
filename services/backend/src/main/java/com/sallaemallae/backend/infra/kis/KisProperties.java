package com.sallaemallae.backend.infra.kis;

import lombok.Getter;
import lombok.ToString;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Getter
@Component
@ToString(onlyExplicitlyIncluded = true)
public class KisProperties {

  @ToString.Include
  private final String mode;
  private final String appKey;
  private final String appSecret;
  private final String accountNo;
  private final String accountProductCode;
  @ToString.Include
  private final int refreshMarginSeconds;
  @ToString.Include
  private final int timeoutSeconds;
  @ToString.Include
  private final int retryAttempts;
  @ToString.Include
  private final long retryBackoffMillis;
  @ToString.Include
  private final int realtimeSubscriptionTtlMinutes;
  @ToString.Include
  private final int realtimeSubscriptionAckTimeoutSeconds;

  public KisProperties(
      @Value("${KIS_MODE:paper}") String mode,
      @Value("${KIS_APP_KEY:}") String appKey,
      @Value("${KIS_APP_SECRET:}") String appSecret,
      @Value("${KIS_ACCOUNT_NO:}") String accountNo,
      @Value("${KIS_ACCOUNT_PRODUCT_CODE:}") String accountProductCode,
      @Value("${KIS_REFRESH_MARGIN_SECONDS:120}") int refreshMarginSeconds,
      @Value("${KIS_TIMEOUT_SECONDS:8}") int timeoutSeconds,
      @Value("${KIS_RETRY_ATTEMPTS:1}") int retryAttempts,
      @Value("${KIS_RETRY_BACKOFF_MILLIS:250}") long retryBackoffMillis,
      @Value("${KIS_REALTIME_SUBSCRIPTION_TTL_MINUTES:30}") int realtimeSubscriptionTtlMinutes,
      @Value("${KIS_REALTIME_SUBSCRIPTION_ACK_TIMEOUT_SECONDS:7}") int realtimeSubscriptionAckTimeoutSeconds
  ) {
    this.mode = mode;
    this.appKey = appKey;
    this.appSecret = appSecret;
    this.accountNo = accountNo;
    this.accountProductCode = accountProductCode;
    this.refreshMarginSeconds = refreshMarginSeconds;
    this.timeoutSeconds = timeoutSeconds;
    this.retryAttempts = retryAttempts;
    this.retryBackoffMillis = retryBackoffMillis;
    this.realtimeSubscriptionTtlMinutes = realtimeSubscriptionTtlMinutes;
    this.realtimeSubscriptionAckTimeoutSeconds = realtimeSubscriptionAckTimeoutSeconds;
  }

  public boolean isConfigured() {
    return appKey != null && !appKey.isBlank() && appSecret != null && !appSecret.isBlank();
  }

  public void validateConfigured() {
    if (!isConfigured()) {
      throw new KisApiException(503, "KIS_CONFIG_MISSING", "한국투자증권 인증 정보가 설정되지 않았습니다.");
    }
  }

  public String restBaseUrl() {
    return isProdMode()
        ? "https://openapi.koreainvestment.com:9443"
        : "https://openapivts.koreainvestment.com:29443";
  }

  public String wsBaseUrl() {
    return isProdMode()
        ? "ws://ops.koreainvestment.com:21000"
        : "ws://ops.koreainvestment.com:31000";
  }

  public boolean isProdMode() {
    return "prod".equalsIgnoreCase(mode);
  }
}
