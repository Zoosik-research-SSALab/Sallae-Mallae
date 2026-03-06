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

    log.debug("Login fail count for {}: {}", email, count);
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
    log.debug("Deleted login fail count for {}", email);
  }

  /**
   * 계정 잠금 여부 확인 (5회 이상 실패)
   */
  public boolean isAccountLocked(String email) {
    return getLoginFailCount(email) >= 5;
  }
}
