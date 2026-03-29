package com.sallaemallae.backend.infra.kis.cache;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeMinuteCandleData;
import com.sallaemallae.backend.infra.kis.websocket.KisRealtimeTradeTickData;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

@Slf4j
@Repository
@RequiredArgsConstructor
public class KisRealtimeCacheRepository {

  private static final TypeReference<List<KisRealtimeMinuteCandleData>> MINUTE_CANDLE_LIST =
      new TypeReference<>() {
      };

  private final StringRedisTemplate redisTemplate;
  private final ObjectMapper objectMapper;
  private final MarketCacheKeyFactory cacheKeyFactory;

  public Optional<KisRealtimeTradeTickData> getLatestTick(String marketCode, String ticker) {
    return read(cacheKeyFactory.realtimeTick(marketCode, ticker), KisRealtimeTradeTickData.class);
  }

  public void saveLatestTick(String marketCode, String ticker, KisRealtimeTradeTickData tick, Duration ttl) {
    write(cacheKeyFactory.realtimeTick(marketCode, ticker), tick, ttl);
  }

  public Optional<KisRealtimeMinuteCandleData> getCurrentMinuteCandle(String marketCode, String ticker) {
    return read(cacheKeyFactory.realtimeMinuteCurrent(marketCode, ticker), KisRealtimeMinuteCandleData.class);
  }

  public void saveCurrentMinuteCandle(
      String marketCode,
      String ticker,
      KisRealtimeMinuteCandleData candle,
      Duration ttl
  ) {
    write(cacheKeyFactory.realtimeMinuteCurrent(marketCode, ticker), candle, ttl);
  }

  public void deleteCurrentMinuteCandle(String marketCode, String ticker) {
    try {
      redisTemplate.delete(cacheKeyFactory.realtimeMinuteCurrent(marketCode, ticker));
    } catch (Exception e) {
      log.warn("Failed to delete realtime minute candle cache. marketCode={}, ticker={}", marketCode, ticker, e);
    }
  }

  public List<KisRealtimeMinuteCandleData> getRecentMinuteCandles(String marketCode, String ticker) {
    String key = cacheKeyFactory.realtimeMinuteRecent(marketCode, ticker);
    try {
      String json = redisTemplate.opsForValue().get(key);
      if (json == null || json.isBlank()) {
        return List.of();
      }
      return objectMapper.readValue(json, MINUTE_CANDLE_LIST);
    } catch (Exception e) {
      log.warn("Failed to read realtime minute candle cache. key={}", key, e);
      return List.of();
    }
  }

  public void saveRecentMinuteCandles(
      String marketCode,
      String ticker,
      List<KisRealtimeMinuteCandleData> candles,
      Duration ttl
  ) {
    write(cacheKeyFactory.realtimeMinuteRecent(marketCode, ticker), candles, ttl);
  }

  public List<KisRealtimeMinuteCandleData> trimToLimit(List<KisRealtimeMinuteCandleData> candles, int limit) {
    if (candles == null || candles.isEmpty()) {
      return List.of();
    }
    if (candles.size() <= limit) {
      return Collections.unmodifiableList(candles);
    }
    return Collections.unmodifiableList(candles.subList(0, limit));
  }

  private <T> Optional<T> read(String key, Class<T> type) {
    try {
      String json = redisTemplate.opsForValue().get(key);
      if (json == null || json.isBlank()) {
        return Optional.empty();
      }
      return Optional.of(objectMapper.readValue(json, type));
    } catch (Exception e) {
      log.warn("Failed to read realtime cache. key={}", key, e);
      return Optional.empty();
    }
  }

  private void write(String key, Object value, Duration ttl) {
    try {
      redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(value), ttl);
    } catch (Exception e) {
      log.warn("Failed to write realtime cache. key={}", key, e);
    }
  }
}
