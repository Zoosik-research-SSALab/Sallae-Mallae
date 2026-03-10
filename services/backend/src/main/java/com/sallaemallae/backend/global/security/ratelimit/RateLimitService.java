package com.sallaemallae.backend.global.security.ratelimit;

import java.util.Collections;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitService {

  private final StringRedisTemplate redisTemplate;

  private static final String RATE_LIMIT_PREFIX = "RATE_LIMIT:";

  private static final RedisScript<Long> INCR_WITH_EXPIRE_SCRIPT = new DefaultRedisScript<>(
      "local count = redis.call('INCR', KEYS[1]) "
          + "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end "
          + "return count",
      Long.class
  );

  /**
   * IP 기반 Rate Limit 체크
   */
  public RateLimitResult checkIpLimit(String ip, RateLimitPolicy policy) {
    String key = RATE_LIMIT_PREFIX + "IP:" + ip + ":" + policy.getAction();
    return checkLimit(key, policy.getLimit(), policy.getWindowSeconds());
  }

  /**
   * 이메일 기반 Rate Limit 체크 (인증코드 발송용)
   */
  public RateLimitResult checkEmailLimit(String email, int limit, int windowSeconds) {
    String key = RATE_LIMIT_PREFIX + "EMAIL:" + email;
    return checkLimit(key, limit, windowSeconds);
  }

  /**
   * 사용자 기반 Rate Limit 체크 (회원 탈퇴 등)
   */
  public RateLimitResult checkUserLimit(Long userId, RateLimitPolicy policy) {
    String key = RATE_LIMIT_PREFIX + "USER:" + userId + ":" + policy.getAction();
    return checkLimit(key, policy.getLimit(), policy.getWindowSeconds());
  }

  private RateLimitResult checkLimit(String key, int limit, int windowSeconds) {
    Long count = redisTemplate.execute(
        INCR_WITH_EXPIRE_SCRIPT,
        Collections.singletonList(key),
        String.valueOf(windowSeconds)
    );

    if (count == null) {
      return RateLimitResult.allowed(limit, limit - 1, windowSeconds);
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
