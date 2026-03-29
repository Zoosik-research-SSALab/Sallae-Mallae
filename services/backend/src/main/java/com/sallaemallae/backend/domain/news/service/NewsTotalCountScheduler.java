package com.sallaemallae.backend.domain.news.service;

import com.sallaemallae.backend.domain.news.repository.PipelineSignalRepository;
import com.sallaemallae.backend.domain.news.repository.StockNewsRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.concurrent.atomic.AtomicReference;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 뉴스 전체 기사 수를 Redis에 캐싱하는 스케줄러.
 *
 * 동작 방식:
 * - 장마감(15:30 KST) 이후부터 5분마다 NEWS_PIPELINE_DONE 신호 폴링
 * - 신호 감지 → 전체 기사 수 Redis 갱신 → 다음 장마감까지 휴면
 * - 장마감 전에는 폴링하지 않음
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NewsTotalCountScheduler {

  private final PipelineSignalRepository pipelineSignalRepository;
  private final StockNewsRepository stockNewsRepository;
  private final StringRedisTemplate redisTemplate;

  private static final String REDIS_KEY_PREFIX = "news:total_count:";
  private static final ZoneId KST = ZoneId.of("Asia/Seoul");
  private static final LocalTime MARKET_CLOSE = LocalTime.of(15, 30);

  /** 마지막으로 신호를 처리한 시각 (재기동 시 당일 신호를 놓치지 않도록 당일 00:00 초기화) */
  private final AtomicReference<OffsetDateTime> lastProcessedAt =
      new AtomicReference<>(LocalDate.now(KST).atStartOfDay(KST).toOffsetDateTime());

  /**
   * 5분마다 실행. 장마감 이후에만 폴링하며, 같은 날 재처리 신호도 반영한다.
   * lastProcessedAt 이후 새 신호가 있을 때마다 기사 수를 갱신한다.
   */
  @Scheduled(fixedRate = 300_000)
  public void refreshTotalCount() {
    ZonedDateTime now = ZonedDateTime.now(KST);

    // 장마감 전이면 스킵
    if (now.toLocalTime().isBefore(MARKET_CLOSE)) {
      return;
    }

    OffsetDateTime since = lastProcessedAt.get();
    boolean hasDoneSignal = pipelineSignalRepository.existsDoneSignalSince(since);

    if (!hasDoneSignal) {
      return;
    }

    // 전체 기사 수 조회 및 Redis 갱신
    OffsetDateTime nowOffset = now.toOffsetDateTime();
    long totalCount = stockNewsRepository.countAllNews(null, nowOffset);

    String redisKey = REDIS_KEY_PREFIX + LocalDate.now(KST);
    redisTemplate.opsForValue().set(redisKey, String.valueOf(totalCount));
    log.info("[뉴스 카운트] NEWS_PIPELINE_DONE 감지 → Redis 갱신 완료: {} = {}", redisKey, totalCount);

    lastProcessedAt.set(nowOffset);
  }
}
