package com.sallaemallae.backend.infra.kis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sallaemallae.backend.infra.kis.cache.MarketCacheKeyFactory;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class KisTokenManager {

  private final KisAuthClient kisAuthClient;
  private final KisProperties properties;
  private final MarketCacheKeyFactory cacheKeyFactory;
  private final StringRedisTemplate redisTemplate;
  private final ObjectMapper objectMapper;

  private volatile CachedSecret memoryCache;

  public String getAccessToken() {
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

      KisAuthClient.AccessTokenPayload issued = kisAuthClient.issueAccessToken();
      CachedSecret fresh = new CachedSecret(issued.accessToken(), issued.expiresAt());
      memoryCache = fresh;
      writeToRedis(fresh);
      return fresh.value();
    }
  }

  public boolean hasValidCachedToken() {
    return isValid(memoryCache) || readFromRedis().filter(this::isValid).isPresent();
  }

  private boolean isValid(CachedSecret secret) {
    return secret != null
        && OffsetDateTime.now().plusSeconds(properties.getRefreshMarginSeconds()).isBefore(secret.expiresAt());
  }

  private Optional<CachedSecret> readFromRedis() {
    String key = cacheKeyFactory.accessToken();
    try {
      String json = redisTemplate.opsForValue().get(key);
      if (json == null || json.isBlank()) {
        return Optional.empty();
      }
      return Optional.of(objectMapper.readValue(json, CachedSecret.class));
    } catch (Exception e) {
      log.warn("Failed to read KIS access token cache.", e);
      return Optional.empty();
    }
  }

  private void writeToRedis(CachedSecret secret) {
    String key = cacheKeyFactory.accessToken();
    try {
      Duration ttl = Duration.between(
          OffsetDateTime.now(),
          secret.expiresAt().minusSeconds(properties.getRefreshMarginSeconds())
      );
      if (ttl.isNegative() || ttl.isZero()) {
        return;
      }
      redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(secret), ttl);
    } catch (Exception e) {
      log.warn("Failed to write KIS access token cache.", e);
    }
  }

  public record CachedSecret(String value, OffsetDateTime expiresAt) {
  }
}
