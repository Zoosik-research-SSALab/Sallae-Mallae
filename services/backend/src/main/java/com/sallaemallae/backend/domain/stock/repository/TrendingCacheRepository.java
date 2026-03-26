package com.sallaemallae.backend.domain.stock.repository;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations.TypedTuple;
import org.springframework.stereotype.Repository;

/**
 * 인기 검색 종목 Redis 저장소.
 * Sorted Set으로 종목별 검색 횟수를 관리하며, TTL 하루로 매일 자동 초기화.
 */
@Repository
@RequiredArgsConstructor
public class TrendingCacheRepository {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final String KEY_PREFIX = "TRENDING_STOCKS:";

    private final StringRedisTemplate stringRedisTemplate;

    /** 종목 검색 횟수 1 증가 (TTL은 당일 자정까지로 설정) */
    public void incrementSearchCount(Long stockId) {
        String key = todayKey();
        stringRedisTemplate.opsForZSet().incrementScore(key, String.valueOf(stockId), 1);
        Duration ttl = Duration.between(
            ZonedDateTime.now(KST),
            LocalDate.now(KST).plusDays(1).atStartOfDay(KST)
        );
        stringRedisTemplate.expire(key, ttl);
    }

    /** 검색 횟수 상위 N개 종목 ID 조회 (내림차순) */
    public Set<String> getTopStockIds(int limit) {
        Set<TypedTuple<String>> tuples = stringRedisTemplate.opsForZSet()
            .reverseRangeWithScores(todayKey(), 0, limit - 1);
        if (tuples == null || tuples.isEmpty()) {
            return Set.of();
        }
        // 순서 유지를 위해 LinkedHashSet
        Set<String> result = new LinkedHashSet<>();
        for (TypedTuple<String> tuple : tuples) {
            if (tuple.getValue() != null) {
                result.add(tuple.getValue());
            }
        }
        return result;
    }

    private String todayKey() {
        return KEY_PREFIX + LocalDate.now(KST);
    }
}
