package com.sallaemallae.backend.global.security.ratelimit;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RateLimitResult {

  private final boolean allowed;
  private final int limit;
  private final int remaining;
  private final long resetSeconds;

  public static RateLimitResult allowed(int limit, int remaining, long resetSeconds) {
    return new RateLimitResult(true, limit, remaining, resetSeconds);
  }

  public static RateLimitResult blocked(int limit, int remaining, long resetSeconds) {
    return new RateLimitResult(false, limit, remaining, resetSeconds);
  }
}
