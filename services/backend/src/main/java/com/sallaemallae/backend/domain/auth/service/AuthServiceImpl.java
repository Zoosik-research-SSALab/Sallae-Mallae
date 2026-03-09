package com.sallaemallae.backend.domain.auth.service;

import com.sallaemallae.backend.domain.auth.dto.AuthStatusResponse;
import com.sallaemallae.backend.domain.auth.dto.LoginRequest;
import com.sallaemallae.backend.domain.auth.dto.LoginResponse;
import com.sallaemallae.backend.domain.auth.dto.RefreshResponse;
import com.sallaemallae.backend.domain.auth.dto.SignupRequest;
import com.sallaemallae.backend.domain.auth.entity.LoginHistory;
import com.sallaemallae.backend.domain.auth.entity.User;
import com.sallaemallae.backend.domain.auth.enumtype.AuthProvider;
import com.sallaemallae.backend.domain.auth.enumtype.UserStatus;
import com.sallaemallae.backend.domain.auth.exception.AuthErrorCode;
import com.sallaemallae.backend.domain.auth.repository.LoginHistoryRepository;
import com.sallaemallae.backend.domain.auth.repository.SocialAccountRepository;
import com.sallaemallae.backend.domain.auth.repository.UserRepository;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.global.security.jwt.JwtProvider;
import com.sallaemallae.backend.global.security.jwt.RedisTokenService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

  private static final String REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
  private static final String REFRESH_TOKEN_COOKIE_PATH = "/api/auth";
  private static final int RECOVERY_PERIOD_DAYS = 30;

  // Dummy hash for timing attack prevention (same computation time for non-existent users)
  private static final String DUMMY_HASH =
      "$2a$10$dummyHashForTimingAttackPreventionXXXXXXXXXXXXXXXXXXXX";

  private final UserRepository userRepository;
  private final SocialAccountRepository socialAccountRepository;
  private final LoginHistoryRepository loginHistoryRepository;
  private final JwtProvider jwtProvider;
  private final RedisTokenService redisTokenService;
  private final PasswordEncoder passwordEncoder;

  @Override
  @Transactional(readOnly = true)
  public AuthStatusResponse getAuthStatus() {
    return new AuthStatusResponse(false, null, "GUEST");
  }

  @Override
  @Transactional
  public LoginResponse login(LoginRequest request, String deviceId, String userAgent,
      String ipAddress, HttpServletResponse response) {

    String email = request.email();

    // 1. Check account lock status
    if (redisTokenService.isAccountLocked(email)) {
      throw new BusinessException(AuthErrorCode.LOGIN_ACCOUNT_LOCKED);
    }

    // 2. Find user by email
    User user = userRepository.findByEmail(email).orElse(null);

    if (user == null) {
      // Timing attack prevention - always hash even if user not found
      passwordEncoder.matches(request.password(), DUMMY_HASH);
      throw new BusinessException(AuthErrorCode.LOGIN_INVALID_CREDENTIALS);
    }

    // 3. Check user status
    validateUserStatus(user);

    // 4. Validate password
    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      // Record failed login attempt
      redisTokenService.incrementLoginFailCount(email);
      loginHistoryRepository.save(
          LoginHistory.loginFail(user.getId(), email, ipAddress, userAgent));
      throw new BusinessException(AuthErrorCode.LOGIN_INVALID_CREDENTIALS);
    }

    // 5. Login success - clear fail counter
    redisTokenService.deleteLoginFailCount(email);

    // 6. Generate tokens
    String role = user.isAdmin() ? "ADMIN" : "USER";
    String accessToken = jwtProvider.createAccessToken(
        user.getId(), role, user.getTokenVersion(), deviceId);
    String refreshToken = jwtProvider.createRefreshToken(user.getId(), deviceId);

    // 7. Save refresh token to Redis
    redisTokenService.saveRefreshToken(user.getId(), deviceId, refreshToken);

    // 8. Record successful login
    loginHistoryRepository.save(
        LoginHistory.loginSuccess(user.getId(), email, ipAddress, userAgent));

    // 9. Set refresh token cookie
    setRefreshTokenCookie(response, refreshToken);

    // 10. Determine provider
    AuthProvider provider = determineProvider(user);

    // 11. Build and return response
    return LoginResponse.of(
        accessToken,
        jwtProvider.getAccessTokenExpirationSeconds(),
        LoginResponse.UserInfo.from(user, provider, OffsetDateTime.now())
    );
  }

  @Override
  @Transactional
  public Map<String, Object> signup(SignupRequest request) {
    // 이메일 중복 체크
    if (userRepository.findByEmail(request.email()).isPresent()) {
      return Map.of("success", false, "message", "이미 사용 중인 이메일입니다.");
    }

    // 비밀번호 해시
    String hashedPassword = passwordEncoder.encode(request.password());

    // 사용자 생성
    User user = User.createEmailUser(
        request.email(),
        hashedPassword,
        request.nickname(),
        request.emailOptIn()
    );

    userRepository.save(user);

    return Map.of(
        "success", true,
        "message", "회원가입 성공",
        "userId", user.getId(),
        "email", user.getEmail()
    );
  }

  @Override
  @Transactional
  public void logout(String accessToken, String deviceId, HttpServletResponse response) {
    // 1. Get claims from access token
    Claims claims = jwtProvider.getClaimsIgnoreExpiration(accessToken);
    String jti = claims.get("jti", String.class);
    Long userId = Long.parseLong(claims.getSubject());
    String tokenDeviceId = claims.get("deviceId", String.class);

    // 2. Validate device ID
    if (!deviceId.equals(tokenDeviceId)) {
      throw new BusinessException(AuthErrorCode.TOKEN_DEVICE_MISMATCH);
    }

    // 3. Add access token to blacklist
    long remainingExpiration = jwtProvider.getRemainingExpiration(accessToken);
    if (remainingExpiration > 0) {
      redisTokenService.addToBlacklist(jti, remainingExpiration, "logout");
    }

    // 4. Delete refresh token from Redis
    redisTokenService.deleteRefreshToken(userId, deviceId);

    // 5. Clear refresh token cookie
    clearRefreshTokenCookie(response);

    log.info("User {} logged out from device {}", userId, deviceId);
  }

  @Override
  @Transactional
  public RefreshResponse refresh(HttpServletRequest request, String deviceId,
      HttpServletResponse response) {

    // 1. Extract refresh token from cookie
    String refreshToken = extractRefreshTokenFromCookie(request);
    if (refreshToken == null) {
      throw new BusinessException(AuthErrorCode.TOKEN_REFRESH_EXPIRED);
    }

    // 2. Validate refresh token
    if (!jwtProvider.validateToken(refreshToken)) {
      clearRefreshTokenCookie(response);
      throw new BusinessException(AuthErrorCode.TOKEN_REFRESH_EXPIRED);
    }

    // 3. Extract claims from refresh token
    Claims claims = jwtProvider.getClaims(refreshToken);
    Long userId = Long.parseLong(claims.getSubject());
    String tokenDeviceId = claims.get("deviceId", String.class);

    // 4. Validate device ID matches
    if (!deviceId.equals(tokenDeviceId)) {
      throw new BusinessException(AuthErrorCode.TOKEN_DEVICE_MISMATCH);
    }

    // 5. Check refresh token in Redis (RTR - Refresh Token Rotation)
    String storedRefreshToken = redisTokenService.getRefreshToken(userId, deviceId);
    if (storedRefreshToken == null) {
      clearRefreshTokenCookie(response);
      throw new BusinessException(AuthErrorCode.TOKEN_REFRESH_EXPIRED);
    }
    if (!storedRefreshToken.equals(refreshToken)) {
      // Token reuse detected - possible token theft
      // Delete all tokens for this device as a security measure
      redisTokenService.deleteRefreshToken(userId, deviceId);
      clearRefreshTokenCookie(response);
      throw new BusinessException(AuthErrorCode.TOKEN_ALREADY_USED);
    }

    // 6. Get user and validate token version
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new BusinessException(AuthErrorCode.AUTH_UNAUTHORIZED));

    // 7. Generate new tokens
    String role = user.isAdmin() ? "ADMIN" : "USER";
    String newAccessToken = jwtProvider.createAccessToken(
        userId, role, user.getTokenVersion(), deviceId);
    String newRefreshToken = jwtProvider.createRefreshToken(userId, deviceId);

    // 8. Save new refresh token to Redis (overwrites old one)
    redisTokenService.saveRefreshToken(userId, deviceId, newRefreshToken);

    // 9. Set new refresh token cookie
    setRefreshTokenCookie(response, newRefreshToken);

    log.debug("Token refreshed for user {} device {}", userId, deviceId);

    return RefreshResponse.of(newAccessToken, jwtProvider.getAccessTokenExpirationSeconds());
  }

  @Override
  @Transactional(readOnly = true)
  public String getOAuthStartUrl(String provider) {
    return "/api/v1/auth/oauth/" + provider + "/callback";
  }

  private void validateUserStatus(User user) {
    UserStatus status = user.getStatus();

    switch (status) {
      case WITHDRAWN -> {
        OffsetDateTime withdrawnAt = user.getWithdrawnAt();
        if (withdrawnAt != null) {
          long daysSinceWithdrawal = ChronoUnit.DAYS.between(withdrawnAt, OffsetDateTime.now());
          if (daysSinceWithdrawal <= RECOVERY_PERIOD_DAYS) {
            throw new BusinessException(AuthErrorCode.LOGIN_WITHDRAWN_RECOVERABLE);
          } else {
            throw new BusinessException(AuthErrorCode.LOGIN_WITHDRAWN_EXPIRED);
          }
        }
        throw new BusinessException(AuthErrorCode.LOGIN_WITHDRAWN_EXPIRED);
      }
      case DELETED, BANNED -> throw new BusinessException(AuthErrorCode.LOGIN_ACCOUNT_BANNED);
      case ACTIVE -> {
        // OK - continue with login
      }
    }
  }

  private AuthProvider determineProvider(User user) {
    // If user has no password, they signed up via social login
    if (user.getPasswordHash() == null) {
      return socialAccountRepository.findFirstByUserId(user.getId())
          .map(sa -> sa.getProvider())
          .orElse(AuthProvider.EMAIL);
    }
    return AuthProvider.EMAIL;
  }

  private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
    Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken);
    cookie.setHttpOnly(true);
    cookie.setSecure(true);
    cookie.setPath(REFRESH_TOKEN_COOKIE_PATH);
    cookie.setMaxAge((int) jwtProvider.getRefreshTokenExpirationSeconds());
    cookie.setAttribute("SameSite", "Strict");
    response.addCookie(cookie);
  }

  private void clearRefreshTokenCookie(HttpServletResponse response) {
    Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE_NAME, "");
    cookie.setHttpOnly(true);
    cookie.setSecure(true);
    cookie.setPath(REFRESH_TOKEN_COOKIE_PATH);
    cookie.setMaxAge(0);
    cookie.setAttribute("SameSite", "Strict");
    response.addCookie(cookie);
  }

  private String extractRefreshTokenFromCookie(HttpServletRequest request) {
    Cookie[] cookies = request.getCookies();
    if (cookies == null) {
      return null;
    }
    return Arrays.stream(cookies)
        .filter(c -> REFRESH_TOKEN_COOKIE_NAME.equals(c.getName()))
        .map(Cookie::getValue)
        .findFirst()
        .orElse(null);
  }
}
