package com.sallaemallae.backend.infra.kis.cache;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

@Slf4j
@Repository
@RequiredArgsConstructor
public class DividendYieldSnapshotRepository {

  private final StringRedisTemplate redisTemplate;
  private final ObjectMapper objectMapper;
  private final MarketCacheKeyFactory cacheKeyFactory;

  public Optional<DividendYieldSnapshot> getSnapshot() {
    String key = cacheKeyFactory.dividendYieldSnapshot();
    try {
      String json = redisTemplate.opsForValue().get(key);
      if (json == null || json.isBlank()) {
        return Optional.empty();
      }
      return Optional.of(objectMapper.readValue(json, DividendYieldSnapshot.class));
    } catch (Exception e) {
      log.warn("Failed to read dividend yield snapshot cache.", e);
      return Optional.empty();
    }
  }

  public void saveSnapshot(DividendYieldSnapshot snapshot, Duration ttl) {
    String key = cacheKeyFactory.dividendYieldSnapshot();
    try {
      if (snapshot == null || snapshot.yields() == null || snapshot.yields().isEmpty()) {
        return;
      }
      redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(snapshot), ttl);
    } catch (Exception e) {
      log.warn("Failed to write dividend yield snapshot cache.", e);
    }
  }

  public record DividendYieldSnapshot(
      OffsetDateTime fetchedAt,
      LocalDate fromDate,
      LocalDate toDate,
      int sourceItemCount,
      Map<String, Float> yields,
      String source
  ) {
  }
}
