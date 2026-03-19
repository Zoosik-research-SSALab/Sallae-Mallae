package com.sallaemallae.backend.infra.kis.cache;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

  public <T> Map<String, T> multiGet(List<String> keys, Class<T> type) {
    if (keys == null || keys.isEmpty()) {
      return Map.of();
    }
    List<String> values = redisTemplate.opsForValue().multiGet(keys);
    if (values == null) {
      return Map.of();
    }
    Map<String, T> result = new HashMap<>();
    for (int i = 0; i < keys.size(); i++) {
      String json = values.get(i);
      if (json == null || json.isBlank()) {
        continue;
      }
      try {
        result.put(keys.get(i), objectMapper.readValue(json, type));
      } catch (JsonProcessingException e) {
        log.warn("Failed to deserialize Redis cache. key={}", keys.get(i), e);
      }
    }
    return result;
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
