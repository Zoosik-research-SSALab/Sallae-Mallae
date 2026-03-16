package com.sallaemallae.backend.infra.kis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheKeyFactory;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class KisApprovalKeyManager {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Seoul");

  private final KisAuthClient kisAuthClient;
  private final KisProperties properties;
  private final MarketCacheKeyFactory cacheKeyFactory;
  private final StringRedisTemplate redisTemplate;
  private final ObjectMapper objectMapper;

  private volatile CachedSecret memoryCache;

  public String getApprovalKey() {
    CachedSecret cached = memoryCache;
    if (isValid(cached)) {
      return cached.value();
    }

    synchronized (this) {
      cached = memoryCache;
      if (isValid(cached)) {
        return cached.value();
      }

      Optional<CachedSecret> redisCached = readFromRedis();
      if (redisCached.isPresent() && isValid(redisCached.get())) {
        memoryCache = redisCached.get();
        return redisCached.get().value();
      }

      KisAuthClient.ApprovalKeyPayload issued = kisAuthClient.issueApprovalKey();
      CachedSecret fresh = new CachedSecret(issued.approvalKey(), issued.expiresAt());
      memoryCache = fresh;
      writeToRedis(fresh);
      return fresh.value();
    }
  }

  public boolean hasValidCachedApprovalKey() {
    return isValid(memoryCache) || readFromRedis().filter(this::isValid).isPresent();
  }

  private boolean isValid(CachedSecret secret) {
    return secret != null
        && OffsetDateTime.now(ZONE_ID)
            .plusSeconds(properties.getRefreshMarginSeconds())
            .isBefore(secret.expiresAt());
  }

  private Optional<CachedSecret> readFromRedis() {
    String key = cacheKeyFactory.approvalKey();
    try {
      String json = redisTemplate.opsForValue().get(key);
      if (json == null || json.isBlank()) {
        return Optional.empty();
      }
      return Optional.of(objectMapper.readValue(json, CachedSecret.class));
    } catch (Exception e) {
      log.warn("Failed to read KIS approval key cache.", e);
      return Optional.empty();
    }
  }

  private void writeToRedis(CachedSecret secret) {
    String key = cacheKeyFactory.approvalKey();
    try {
      Duration ttl = Duration.between(
          OffsetDateTime.now(ZONE_ID),
          secret.expiresAt().minusSeconds(properties.getRefreshMarginSeconds())
      );
      if (ttl.isNegative() || ttl.isZero()) {
        return;
      }
      redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(secret), ttl);
    } catch (Exception e) {
      log.warn("Failed to write KIS approval key cache.", e);
    }
  }

  public record CachedSecret(String value, OffsetDateTime expiresAt) {
  }
}
