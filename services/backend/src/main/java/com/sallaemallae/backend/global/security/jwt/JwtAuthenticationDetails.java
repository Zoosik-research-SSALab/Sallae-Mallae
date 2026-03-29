package com.sallaemallae.backend.global.security.jwt;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class JwtAuthenticationDetails {

  private final String deviceId;
  private final Integer tokenVersion;
  private final String authLevel;
  private final Long authTime;

  /**
   * Step-up 인증이 필요한 작업을 위해 ELEVATED 상태인지 확인
   */
  public boolean isElevated() {
    return "ELEVATED".equals(authLevel);
  }

  /**
   * authTime이 특정 시간(분) 이내인지 확인
   */
  public boolean isAuthTimeWithinMinutes(int minutes) {
    if (authTime == null) {
      return false;
    }
    long now = System.currentTimeMillis();
    long diff = now - authTime;
    return diff <= (minutes * 60 * 1000L);
  }
}
