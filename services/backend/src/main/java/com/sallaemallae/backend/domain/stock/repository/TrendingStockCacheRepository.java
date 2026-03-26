package com.sallaemallae.backend.domain.stock.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sallaemallae.backend.domain.stock.dto.TrendingStocksResponse;
import java.time.Duration;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

/**
 * 인기 검색 종목 TOP5 응답 Redis 캐시 저장소.
 * 완성된 응답(가격, 변동률, iconUrl 포함)을 캐싱하여 SSE 연결 시 즉시 전송.
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class TrendingStockCacheRepository {

    private static final String KEY = "trending:top-stocks";
    private static final Duration TTL = Duration.ofMinutes(2);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /** 캐시 조회 */
    public Optional<TrendingStocksResponse> getTrending() {
        String json = redisTemplate.opsForValue().get(KEY);
        if (json == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(json, TrendingStocksResponse.class));
        } catch (JsonProcessingException e) {
            log.warn("인기 검색 종목 캐시 역직렬화 실패 → 손상된 캐시 제거", e);
            redisTemplate.delete(KEY);
            return Optional.empty();
        }
    }

    /** 캐시 무효화 */
    public void invalidate() {
        redisTemplate.delete(KEY);
    }

    /** 캐시 저장 */
    public void saveTrending(TrendingStocksResponse data) {
        try {
            String json = objectMapper.writeValueAsString(data);
            redisTemplate.opsForValue().set(KEY, json, TTL);
        } catch (JsonProcessingException e) {
            log.warn("인기 검색 종목 캐시 직렬화 실패", e);
        }
    }
}
