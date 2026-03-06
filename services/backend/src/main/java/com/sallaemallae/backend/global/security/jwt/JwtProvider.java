package com.sallaemallae.backend.global.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtProvider {

  private final JwtProperties jwtProperties;
  private SecretKey secretKey;

  @PostConstruct
  public void init() {
    this.secretKey = Keys.hmacShaKeyFor(
        jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
  }

  /**
   * Access Token 생성
   */
  public String createAccessToken(Long userId, String role, int tokenVersion, String deviceId) {
    Date now = new Date();
    Date expiry = new Date(now.getTime() + jwtProperties.getAccessTokenExpiration());

    return Jwts.builder()
        .subject(String.valueOf(userId))
        .claim("role", role)
        .claim("tokenVersion", tokenVersion)
        .claim("deviceId", deviceId)
        .claim("jti", UUID.randomUUID().toString())
        .claim("authLevel", "STANDARD")
        .claim("authTime", now.getTime())
        .issuedAt(now)
        .expiration(expiry)
        .signWith(secretKey)
        .compact();
  }

  /**
   * Access Token 생성 (Step-up 인증 후 ELEVATED 레벨)
   */
  public String createElevatedAccessToken(Long userId, String role, int tokenVersion,
      String deviceId) {
    Date now = new Date();
    Date expiry = new Date(now.getTime() + jwtProperties.getAccessTokenExpiration());

    return Jwts.builder()
        .subject(String.valueOf(userId))
        .claim("role", role)
        .claim("tokenVersion", tokenVersion)
        .claim("deviceId", deviceId)
        .claim("jti", UUID.randomUUID().toString())
        .claim("authLevel", "ELEVATED")
        .claim("authTime", now.getTime())
        .issuedAt(now)
        .expiration(expiry)
        .signWith(secretKey)
        .compact();
  }

  /**
   * Refresh Token 생성
   */
  public String createRefreshToken(Long userId, String deviceId) {
    Date now = new Date();
    Date expiry = new Date(now.getTime() + jwtProperties.getRefreshTokenExpiration());

    return Jwts.builder()
        .subject(String.valueOf(userId))
        .claim("deviceId", deviceId)
        .claim("jti", UUID.randomUUID().toString())
        .issuedAt(now)
        .expiration(expiry)
        .signWith(secretKey)
        .compact();
  }

  /**
   * 토큰 검증
   */
  public boolean validateToken(String token) {
    try {
      Jwts.parser()
          .verifyWith(secretKey)
          .build()
          .parseSignedClaims(token);
      return true;
    } catch (ExpiredJwtException e) {
      log.warn("Expired JWT token");
      return false;
    } catch (JwtException e) {
      log.warn("Invalid JWT token: {}", e.getMessage());
      return false;
    }
  }

  /**
   * 토큰에서 Claims 추출
   */
  public Claims getClaims(String token) {
    return Jwts.parser()
        .verifyWith(secretKey)
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }

  /**
   * 토큰에서 Claims 추출 (만료된 토큰도 파싱 가능)
   */
  public Claims getClaimsIgnoreExpiration(String token) {
    try {
      return Jwts.parser()
          .verifyWith(secretKey)
          .build()
          .parseSignedClaims(token)
          .getPayload();
    } catch (ExpiredJwtException e) {
      return e.getClaims();
    }
  }

  /**
   * 토큰에서 userId 추출
   */
  public Long getUserId(String token) {
    return Long.parseLong(getClaims(token).getSubject());
  }

  /**
   * 토큰에서 jti (JWT ID) 추출
   */
  public String getJti(String token) {
    return getClaims(token).get("jti", String.class);
  }

  /**
   * 토큰에서 jti 추출 (만료된 토큰도 가능)
   */
  public String getJtiIgnoreExpiration(String token) {
    return getClaimsIgnoreExpiration(token).get("jti", String.class);
  }

  /**
   * 토큰에서 deviceId 추출
   */
  public String getDeviceId(String token) {
    return getClaims(token).get("deviceId", String.class);
  }

  /**
   * 토큰에서 tokenVersion 추출
   */
  public Integer getTokenVersion(String token) {
    return getClaims(token).get("tokenVersion", Integer.class);
  }

  /**
   * 토큰에서 role 추출
   */
  public String getRole(String token) {
    return getClaims(token).get("role", String.class);
  }

  /**
   * 토큰에서 authLevel 추출
   */
  public String getAuthLevel(String token) {
    return getClaims(token).get("authLevel", String.class);
  }

  /**
   * 토큰에서 authTime 추출
   */
  public Long getAuthTime(String token) {
    return getClaims(token).get("authTime", Long.class);
  }

  /**
   * 토큰 만료 시간 추출 (milliseconds)
   */
  public long getExpiration(String token) {
    return getClaims(token).getExpiration().getTime();
  }

  /**
   * 토큰 남은 유효시간 계산 (milliseconds)
   */
  public long getRemainingExpiration(String token) {
    return getExpiration(token) - System.currentTimeMillis();
  }

  /**
   * Access Token 만료 시간 반환 (seconds)
   */
  public long getAccessTokenExpirationSeconds() {
    return jwtProperties.getAccessTokenExpirationSeconds();
  }

  /**
   * Refresh Token 만료 시간 반환 (seconds)
   */
  public long getRefreshTokenExpirationSeconds() {
    return jwtProperties.getRefreshTokenExpirationSeconds();
  }
}
