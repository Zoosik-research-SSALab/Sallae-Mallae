package com.sallaemallae.backend.domain.auth.enumtype;

public enum TrustLevel {
  NEW,
  RECOGNIZED,
  TRUSTED;

  private static final int RECOGNIZED_THRESHOLD = 2;
  private static final int TRUSTED_THRESHOLD = 5;

  /**
   * 로그인 횟수를 기반으로 신뢰 등급을 반환합니다.
   */
  public static TrustLevel fromLoginCount(int loginCount) {
    if (loginCount >= TRUSTED_THRESHOLD) {
      return TRUSTED;
    }
    if (loginCount >= RECOGNIZED_THRESHOLD) {
      return RECOGNIZED;
    }
    return NEW;
  }
}
