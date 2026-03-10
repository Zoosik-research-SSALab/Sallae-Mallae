package com.sallaemallae.backend.global.security.ratelimit;

import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitService {

  private final StringRedisTemplate redisTemplate;

  private static final String RATE_LIMIT_PREFIX = "RATE_LIMIT:";

  /**
   * IP 기반 Rate Limit 체크
   * @return true면 허용, false면 차단
   */
  public RateLimitResult checkIpLimit(String ip, RateLimitPolicy policy) {
    String key = RATE_LIMIT_PREFIX + "IP:" + ip + ":" + policy.getAction();
    return checkLimit(key, policy);
  }

  /**
   * 이메일 기반 Rate Limit 체크 (인증코드 발송용)
   */
  public RateLimitResult checkEmailLimit(String email, int limit, int windowSeconds) {
    String key = RATE_LIMIT_PREFIX + "EMAIL:" + email;
    return checkLimit(key, limit, windowSeconds);
  }

  private RateLimitResult checkLimit(String key, RateLimitPolicy policy) {
    return checkLimit(key, policy.getLimit(), policy.getWindowSeconds());
  }

  private RateLimitResult checkLimit(String key, int limit, int windowSeconds) {
    Long count = redisTemplate.opsForValue().increment(key);
    if (count == null) {
      return RateLimitResult.allowed(limit, limit - 1, windowSeconds);
    }

    if (count == 1) {
      redisTemplate.expire(key, windowSeconds, TimeUnit.SECONDS);
    }

    int remaining = Math.max(0, limit - count.intValue());
    Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
    long resetSeconds = ttl != null && ttl > 0 ? ttl : windowSeconds;

    if (count > limit) {
      log.warn("Rate limit exceeded: key={}, count={}, limit={}", key, count, limit);
      return RateLimitResult.blocked(limit, 0, resetSeconds);
    }

    return RateLimitResult.allowed(limit, remaining, resetSeconds);
  }
}
