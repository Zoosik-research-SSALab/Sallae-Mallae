package com.sallaemallae.backend.domain.stock.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sallaemallae.backend.domain.stock.dto.StockKeywordsResponse;
import java.time.Duration;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

/**
 * 종목별 키워드+뉴스 Redis 캐시 (24시간 TTL, 크롤링 일 1회 기준)
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class StockKeywordsCacheRepository {

    private static final String KEY_PREFIX = "stock:keywords:";
    private static final Duration TTL = Duration.ofHours(24);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /** 캐시에서 종목 키워드 데이터 조회 */
    public Optional<StockKeywordsResponse> get(Long stockId) {
        try {
            String json = redisTemplate.opsForValue().get(KEY_PREFIX + stockId);
            if (json == null) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(json, StockKeywordsResponse.class));
        } catch (JsonProcessingException e) {
            log.error("Redis 캐시 역직렬화 실패: stockId={}", stockId, e);
            return Optional.empty();
        }
    }

    /** 캐시에 종목 키워드 데이터 저장 */
    public void save(Long stockId, StockKeywordsResponse data) {
        try {
            String json = objectMapper.writeValueAsString(data);
            redisTemplate.opsForValue().set(KEY_PREFIX + stockId, json, TTL);
        } catch (JsonProcessingException e) {
            log.error("Redis 캐시 직렬화 실패: stockId={}", stockId, e);
        }
    }
}
