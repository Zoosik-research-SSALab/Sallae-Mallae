package com.sallaemallae.backend.global.security.ratelimit;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RateLimitPolicy {

  LOGIN("LOGIN", 10, 60),
  EMAIL_SEND("EMAIL", 5, 600),
  EMAIL_VERIFY("EMAIL_VERIFY", 10, 600),
  OAUTH("OAUTH", 10, 60),
  SIGNUP("SIGNUP", 5, 3600),
  REFRESH("REFRESH", 30, 3600),
  CHECK_EMAIL("CHECK_EMAIL", 20, 60),
  PWD_RESET_REQUEST("PWD_RESET", 3, 600),
  PWD_RESET("PWD_RESET_CONFIRM", 5, 3600),
  POLICY("POLICY", 10, 3600),
  GENERAL("API", 100, 60);

  private final String action;
  private final int limit;
  private final int windowSeconds;
}
