package com.sallaemallae.backend.domain.news.service;

import com.sallaemallae.backend.domain.news.repository.PipelineSignalRepository;
import com.sallaemallae.backend.domain.news.repository.StockNewsRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 뉴스 전체 기사 수를 Redis에 캐싱하는 스케줄러.
 * 매일 20시(KST)에 pipeline_signals 테이블에서 당일 NEWS_PIPELINE_DONE 신호를 확인하고,
 * 완료 신호가 있으면 DB에서 전체 기사 수를 조회하여 Redis에 갱신한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NewsTotalCountScheduler {

  private final PipelineSignalRepository pipelineSignalRepository;
  private final StockNewsRepository stockNewsRepository;
  private final StringRedisTemplate redisTemplate;

  private static final String REDIS_KEY = "news:total_count";
  private static final ZoneId KST = ZoneId.of("Asia/Seoul");

  // 매일 20시(KST) 실행
  @Scheduled(cron = "0 0 20 * * *", zone = "Asia/Seoul")
  public void refreshTotalCount() {
    // 오늘 00:00 KST 이후의 완료 신호 확인
    OffsetDateTime todayStart = LocalDate.now(KST)
        .atStartOfDay(KST)
        .toOffsetDateTime();

    boolean hasDoneSignal = pipelineSignalRepository.existsDoneSignalSince(todayStart);

    if (!hasDoneSignal) {
      log.info("[뉴스 카운트] 당일 NEWS_PIPELINE_DONE 신호 없음 — 스킵");
      return;
    }

    // 전체 기사 수 조회 (endDateTime = 현재 시각)
    OffsetDateTime now = OffsetDateTime.now(KST);
    long totalCount = stockNewsRepository.countAllNews(null, now);

    redisTemplate.opsForValue().set(REDIS_KEY, String.valueOf(totalCount));
    log.info("[뉴스 카운트] Redis 갱신 완료: {} = {}", REDIS_KEY, totalCount);
  }
}
