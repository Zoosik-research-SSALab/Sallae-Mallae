package com.sallaemallae.backend.domain.main.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sallaemallae.backend.domain.main.dto.CategoryStocksResponse;
import com.sallaemallae.backend.domain.main.dto.MarketIndexResponse;
import com.sallaemallae.backend.domain.main.dto.NewSignalsResponse;
import com.sallaemallae.backend.domain.main.dto.TopStocksResponse;
import java.time.Duration;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

@Slf4j
@Repository
@RequiredArgsConstructor
public class MainCacheRepository {

    private static final String KEY_TOP_STOCKS = "main:top-stocks";
    private static final String KEY_MARKET_INDEX = "main:market-index";
    private static final String KEY_CATEGORIES = "main:categories";
    private static final String KEY_NEW_SIGNALS = "main:new-signals";
    private static final Duration TTL = Duration.ofMinutes(2);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    /** 추천 종목 TOP10 캐시 조회 */
    public Optional<TopStocksResponse> getTopStocks() {
        return read(KEY_TOP_STOCKS, TopStocksResponse.class);
    }

    /** 추천 종목 TOP10 캐시 저장 */
    public void saveTopStocks(TopStocksResponse data) {
        write(KEY_TOP_STOCKS, data);
    }

    /** 시장 지수 캐시 조회 */
    public Optional<MarketIndexResponse> getMarketIndex() {
        return read(KEY_MARKET_INDEX, MarketIndexResponse.class);
    }

    /** 시장 지수 캐시 저장 */
    public void saveMarketIndex(MarketIndexResponse data) {
        write(KEY_MARKET_INDEX, data);
    }

    /** 카테고리별 종목 캐시 조회 */
    public Optional<CategoryStocksResponse> getCategories() {
        return read(KEY_CATEGORIES, CategoryStocksResponse.class);
    }

    /** 카테고리별 종목 캐시 저장 */
    public void saveCategories(CategoryStocksResponse data) {
        write(KEY_CATEGORIES, data);
    }

    /** 당일 매수/매도 신호 캐시 조회 */
    public Optional<NewSignalsResponse> getNewSignals() {
        return read(KEY_NEW_SIGNALS, NewSignalsResponse.class);
    }

    /** 당일 매수/매도 신호 캐시 저장 */
    public void saveNewSignals(NewSignalsResponse data) {
        write(KEY_NEW_SIGNALS, data);
    }

    // ── private helpers ──

    private <T> Optional<T> read(String key, Class<T> type) {
        try {
            String json = redisTemplate.opsForValue().get(key);
            if (json == null) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(json, type));
        } catch (JsonProcessingException e) {
            log.error("Redis 캐시 역직렬화 실패: key={}", key, e);
            return Optional.empty();
        }
    }

    private void write(String key, Object data) {
        try {
            String json = objectMapper.writeValueAsString(data);
            redisTemplate.opsForValue().set(key, json, TTL);
        } catch (JsonProcessingException e) {
            log.error("Redis 캐시 직렬화 실패: key={}", key, e);
        }
    }
}
