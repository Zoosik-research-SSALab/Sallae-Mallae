package com.sallaemallae.backend.global.security.ratelimit;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum RateLimitPolicy {

  LOGIN("LOGIN", 100, 60),
  EMAIL_SEND("EMAIL", 30, 600),
  EMAIL_VERIFY("EMAIL_VERIFY", 50, 600),
  OAUTH("OAUTH", 50, 60),
  SIGNUP("SIGNUP", 30, 3600),
  REFRESH("REFRESH", 100, 3600),
  CHECK_EMAIL("CHECK_EMAIL", 100, 60),
  PWD_RESET_REQUEST("PWD_RESET", 20, 600),
  PWD_RESET("PWD_RESET_CONFIRM", 20, 3600),
  POLICY("POLICY", 50, 3600),
  WITHDRAW("WITHDRAW", 5, 86400),
  GENERAL("API", 500, 60);

  private final String action;
  private final int limit;
  private final int windowSeconds;
}
