package com.sallaemallae.backend.infra.kis.cache;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

@Slf4j
@Repository
@RequiredArgsConstructor
public class MarketCacheRepository {

  private final StringRedisTemplate redisTemplate;
  private final ObjectMapper objectMapper;

  public <T> Optional<T> get(String key, Class<T> type) {
    try {
      String json = redisTemplate.opsForValue().get(key);
      if (json == null || json.isBlank()) {
        return Optional.empty();
      }
      return Optional.of(objectMapper.readValue(json, type));
    } catch (JsonProcessingException e) {
      log.warn("Failed to deserialize Redis cache. key={}", key, e);
      return Optional.empty();
    }
  }

  public void put(String key, Object value, Duration ttl) {
    try {
      String json = objectMapper.writeValueAsString(value);
      redisTemplate.opsForValue().set(key, json, ttl);
    } catch (JsonProcessingException e) {
      log.warn("Failed to serialize Redis cache. key={}", key, e);
    }
  }
}
