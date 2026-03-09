package com.sallaemallae.backend.global.security.jwt;

import java.util.Set;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisTokenService {

  private final StringRedisTemplate redisTemplate;
  private final JwtProperties jwtProperties;

  // Key Prefix 상수
  private static final String RT_PREFIX = "RT:";          // Refresh Token
  private static final String BL_PREFIX = "BL:";          // Blacklist (Access Token)
  private static final String LOGIN_FAIL_PREFIX = "LOGIN_FAIL:";  // 로그인 실패 카운터
  private static final String EMAIL_VERIFY_PREFIX = "EMAIL_VERIFY:";  // 이메일 인증코드
  private static final String VERIFIED_PREFIX = "VERIFIED:";  // 인증 완료 토큰
  private static final String TEMP_PREFIX = "TEMP:";      // 소셜 로그인 임시 토큰
  private static final String OAUTH_STATE_PREFIX = "OAUTH_STATE:";  // OAuth state CSRF 검증

  // 이메일 인증 관련 상수
  private static final long VERIFICATION_CODE_TTL_SECONDS = 300;  // 5분
  private static final long VERIFIED_TOKEN_TTL_SECONDS = 600;  // 10분
  private static final int MAX_VERIFICATION_ATTEMPTS = 5;

  // OAuth 관련 상수
  private static final long TEMP_TOKEN_TTL_SECONDS = 600;  // 10분
  private static final long OAUTH_STATE_TTL_SECONDS = 300;  // 5분

  // ==================== Refresh Token 관리 ====================

  /**
   * Refresh Token 저장
   * Key: RT:{userId}:{deviceId}
   */
  public void saveRefreshToken(Long userId, String deviceId, String refreshToken) {
    String key = RT_PREFIX + userId + ":" + deviceId;
    redisTemplate.opsForValue().set(
        key,
        refreshToken,
        jwtProperties.getRefreshTokenExpiration(),
        TimeUnit.MILLISECONDS
    );
    log.debug("Saved refresh token for user {} device {}", userId, deviceId);
  }

  /**
   * Refresh Token 조회
   */
  public String getRefreshToken(Long userId, String deviceId) {
    String key = RT_PREFIX + userId + ":" + deviceId;
    return redisTemplate.opsForValue().get(key);
  }

  /**
   * Refresh Token 삭제 (로그아웃)
   */
  public void deleteRefreshToken(Long userId, String deviceId) {
    String key = RT_PREFIX + userId + ":" + deviceId;
    redisTemplate.delete(key);
    log.debug("Deleted refresh token for user {} device {}", userId, deviceId);
  }

  /**
   * 사용자의 모든 Refresh Token 삭제 (전체 로그아웃)
   */
  public long deleteAllRefreshTokens(Long userId) {
    String pattern = RT_PREFIX + userId + ":*";
    Set<String> keys = redisTemplate.keys(pattern);
    if (keys != null && !keys.isEmpty()) {
      redisTemplate.delete(keys);
      log.debug("Deleted all {} refresh tokens for user {}", keys.size(), userId);
      return keys.size();
    }
    return 0;
  }

  // ==================== Access Token 블랙리스트 ====================

  /**
   * Access Token 블랙리스트 등록
   * Key: BL:{jti}
   */
  public void addToBlacklist(String jti, long remainingExpiration, String reason) {
    if (remainingExpiration <= 0) {
      return; // 이미 만료된 토큰은 블랙리스트에 추가할 필요 없음
    }
    String key = BL_PREFIX + jti;
    redisTemplate.opsForValue().set(
        key,
        reason,  // "logout" or "withdrawn"
        remainingExpiration,
        TimeUnit.MILLISECONDS
    );
    log.debug("Added jti {} to blacklist with reason: {}", jti, reason);
  }

  /**
   * Access Token 블랙리스트 확인
   */
  public boolean isBlacklisted(String jti) {
    String key = BL_PREFIX + jti;
    return Boolean.TRUE.equals(redisTemplate.hasKey(key));
  }

  // ==================== 로그인 실패 카운터 ====================

  /**
   * 로그인 실패 횟수 증가
   * Key: LOGIN_FAIL:{email}
   */
  public long incrementLoginFailCount(String email) {
    String key = LOGIN_FAIL_PREFIX + email;
    Long count = redisTemplate.opsForValue().increment(key);

    // 첫 실패 시 TTL 설정 (30분)
    if (count != null && count == 1) {
      redisTemplate.expire(key, 30, TimeUnit.MINUTES);
    }

    // 10회 이상 실패 시 TTL 2시간으로 연장
    if (count != null && count >= 10) {
      redisTemplate.expire(key, 2, TimeUnit.HOURS);
    }

    log.debug("Login fail count for {}: {}", maskEmail(email), count);
    return count != null ? count : 0;
  }

  /**
   * 로그인 실패 횟수 조회
   */
  public long getLoginFailCount(String email) {
    String key = LOGIN_FAIL_PREFIX + email;
    String value = redisTemplate.opsForValue().get(key);
    return value != null ? Long.parseLong(value) : 0;
  }

  /**
   * 로그인 실패 카운터 삭제 (로그인 성공 시)
   */
  public void deleteLoginFailCount(String email) {
    String key = LOGIN_FAIL_PREFIX + email;
    redisTemplate.delete(key);
    log.debug("Deleted login fail count for {}", maskEmail(email));
  }

  /**
   * 계정 잠금 여부 확인 (5회 이상 실패)
   */
  public boolean isAccountLocked(String email) {
    return getLoginFailCount(email) >= 5;
  }

  // ==================== 이메일 인증 관리 ====================

  /**
   * 이메일 인증코드 저장
   * Key: EMAIL_VERIFY:{purpose}:{email}
   * Value: {hashedCode}:{attempts}
   */
  public void saveVerificationCode(String purpose, String email, String hashedCode) {
    String key = EMAIL_VERIFY_PREFIX + purpose + ":" + email;
    String value = hashedCode + ":0";  // 초기 시도 횟수는 0
    redisTemplate.opsForValue().set(
        key,
        value,
        VERIFICATION_CODE_TTL_SECONDS,
        TimeUnit.SECONDS
    );
    log.debug("Saved verification code for email {} with purpose {}", maskEmail(email), purpose);
  }

  /**
   * 이메일 인증코드 정보 조회
   * Returns: [hashedCode, attempts] or null if not found
   */
  public String[] getVerificationCode(String purpose, String email) {
    String key = EMAIL_VERIFY_PREFIX + purpose + ":" + email;
    String value = redisTemplate.opsForValue().get(key);
    if (value == null) {
      return null;
    }
    return value.split(":", 2);
  }

  /**
   * 인증 시도 횟수 증가
   * Returns: 증가 후 시도 횟수
   */
  public int incrementVerificationAttempts(String purpose, String email) {
    String key = EMAIL_VERIFY_PREFIX + purpose + ":" + email;
    String value = redisTemplate.opsForValue().get(key);
    if (value == null) {
      return -1;  // 키가 존재하지 않음
    }

    String[] parts = value.split(":", 2);
    String hashedCode = parts[0];
    int attempts = Integer.parseInt(parts[1]) + 1;

    // 남은 TTL 유지하면서 업데이트
    Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
    if (ttl != null && ttl > 0) {
      redisTemplate.opsForValue().set(
          key,
          hashedCode + ":" + attempts,
          ttl,
          TimeUnit.SECONDS
      );
    }

    log.debug("Verification attempts for {} {}: {}", purpose, maskEmail(email), attempts);
    return attempts;
  }

  /**
   * 인증코드 삭제
   */
  public void deleteVerificationCode(String purpose, String email) {
    String key = EMAIL_VERIFY_PREFIX + purpose + ":" + email;
    redisTemplate.delete(key);
    log.debug("Deleted verification code for {} {}", purpose, maskEmail(email));
  }

  /**
   * 인증 완료 토큰 저장
   * Key: VERIFIED:{purpose}:{token}
   * Value: email
   */
  public void saveVerifiedToken(String purpose, String token, String email) {
    String key = VERIFIED_PREFIX + purpose + ":" + token;
    redisTemplate.opsForValue().set(
        key,
        email,
        VERIFIED_TOKEN_TTL_SECONDS,
        TimeUnit.SECONDS
    );
    log.debug("Saved verified token for email {} with purpose {}", maskEmail(email), purpose);
  }

  /**
   * 인증 완료 토큰 소비 (조회 후 삭제)
   * Returns: email or null if not found
   */
  public String consumeVerifiedToken(String purpose, String token) {
    String key = VERIFIED_PREFIX + purpose + ":" + token;
    String email = redisTemplate.opsForValue().get(key);
    if (email != null) {
      redisTemplate.delete(key);
      log.debug("Consumed verified token for purpose {}", purpose);
    }
    return email;
  }

  /**
   * 인증 완료 토큰 조회 (삭제하지 않음)
   */
  public String getVerifiedToken(String purpose, String token) {
    String key = VERIFIED_PREFIX + purpose + ":" + token;
    return redisTemplate.opsForValue().get(key);
  }

  /**
   * 이메일 마스킹 (로깅용)
   */
  private String maskEmail(String email) {
    if (email == null || !email.contains("@")) {
      return "***";
    }
    String[] parts = email.split("@");
    String localPart = parts[0];
    String domain = parts[1];
    if (localPart.length() <= 2) {
      return "**@" + domain;
    }
    return localPart.substring(0, 2) + "***@" + domain;
  }

  // ==================== OAuth 임시 토큰 관리 ====================

  /**
   * OAuth state 저장 (CSRF 방어)
   * Key: OAUTH_STATE:{state}
   */
  public void saveOAuthState(String state, String provider) {
    String key = OAUTH_STATE_PREFIX + state;
    redisTemplate.opsForValue().set(key, provider, OAUTH_STATE_TTL_SECONDS, TimeUnit.SECONDS);
    log.debug("Saved OAuth state for provider {}", provider);
  }

  /**
   * OAuth state 소비 (조회 후 삭제)
   */
  public String consumeOAuthState(String state) {
    String key = OAUTH_STATE_PREFIX + state;
    String provider = redisTemplate.opsForValue().get(key);
    if (provider != null) {
      redisTemplate.delete(key);
      log.debug("Consumed OAuth state");
    }
    return provider;
  }

  /**
   * 소셜 로그인 임시 토큰 저장
   * Key: TEMP:{tempToken}
   */
  public void saveTempToken(String tempToken, String jsonValue) {
    String key = TEMP_PREFIX + tempToken;
    redisTemplate.opsForValue().set(key, jsonValue, TEMP_TOKEN_TTL_SECONDS, TimeUnit.SECONDS);
    log.debug("Saved temp token for social login");
  }

  /**
   * 소셜 로그인 임시 토큰 소비 (조회 후 삭제)
   */
  public String consumeTempToken(String tempToken) {
    String key = TEMP_PREFIX + tempToken;
    String value = redisTemplate.opsForValue().get(key);
    if (value != null) {
      redisTemplate.delete(key);
      log.debug("Consumed temp token for social login");
    }
    return value;
  }

  /**
   * 최대 인증 시도 횟수 초과 여부 확인
   */
  public boolean isVerificationAttemptsExceeded(String purpose, String email) {
    String[] codeInfo = getVerificationCode(purpose, email);
    if (codeInfo == null || codeInfo.length < 2) {
      return false;
    }
    return Integer.parseInt(codeInfo[1]) >= MAX_VERIFICATION_ATTEMPTS;
  }

  /**
   * 남은 인증 시도 횟수 반환
   */
  public int getRemainingVerificationAttempts(String purpose, String email) {
    String[] codeInfo = getVerificationCode(purpose, email);
    if (codeInfo == null || codeInfo.length < 2) {
      return MAX_VERIFICATION_ATTEMPTS;
    }
    return Math.max(0, MAX_VERIFICATION_ATTEMPTS - Integer.parseInt(codeInfo[1]));
  }
}
