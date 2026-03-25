package com.sallaemallae.backend.domain.stock.service;

import com.sallaemallae.backend.domain.news.repository.PipelineSignalRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * NEWS_PIPELINE_DONE 신호를 폴링하여 종목별 키워드 Redis 캐시를 삭제하는 스케줄러.
 *
 * 동작 방식:
 * - 장마감(15:30 KST) 이후부터 5분마다 DB 폴링 시작
 * - 신호 감지 → 캐시 삭제 → 같은 날 추가 신호도 반영
 * - 장마감 전에는 폴링하지 않음
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StockKeywordsCacheScheduler {

    private static final String CACHE_KEY_PATTERN = "stock:keywords:*";
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final LocalTime MARKET_CLOSE = LocalTime.of(15, 30);

    private final PipelineSignalRepository pipelineSignalRepository;
    private final StringRedisTemplate redisTemplate;

    /** 마지막으로 신호를 처리한 시각 (재기동 시 당일 신호를 놓치지 않도록 당일 00:00 초기화) */
    private final AtomicReference<OffsetDateTime> lastProcessedAt =
        new AtomicReference<>(LocalDate.now(KST).atStartOfDay(KST).toOffsetDateTime());

    /**
     * 5분마다 실행. 장마감 이후에만 폴링하며, 같은 날 재처리 신호도 반영한다.
     * lastProcessedAt 이후 새 신호가 있을 때마다 캐시를 삭제한다.
     */
    @Scheduled(fixedRate = 300_000)
    public void evictKeywordsCache() {
        ZonedDateTime now = ZonedDateTime.now(KST);

        // 장마감 전이면 스킵
        if (now.toLocalTime().isBefore(MARKET_CLOSE)) {
            return;
        }

        OffsetDateTime since = lastProcessedAt.get();
        boolean hasNewSignal = pipelineSignalRepository.existsDoneSignalSince(since);

        if (!hasNewSignal) {
            return;
        }

        Set<String> keys = redisTemplate.keys(CACHE_KEY_PATTERN);
        if (keys == null || keys.isEmpty()) {
            log.info("[키워드 캐시] NEWS_PIPELINE_DONE 감지, 삭제 대상 없음");
        } else {
            Long deleted = redisTemplate.delete(keys);
            log.info("[키워드 캐시] NEWS_PIPELINE_DONE 감지 → Redis 캐시 삭제 완료: {}건", deleted);
        }

        lastProcessedAt.set(now.toOffsetDateTime());
    }
}
