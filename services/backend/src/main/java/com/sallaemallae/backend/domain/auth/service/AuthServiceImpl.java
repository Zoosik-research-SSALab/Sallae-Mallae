package com.sallaemallae.backend.domain.auth.service;

import com.sallaemallae.backend.domain.auth.dto.AuthStatusResponse;
import com.sallaemallae.backend.domain.auth.dto.CheckEmailResponse;
import com.sallaemallae.backend.domain.auth.dto.LoginRequest;
import com.sallaemallae.backend.domain.auth.dto.LoginResponse;
import com.sallaemallae.backend.domain.auth.dto.OAuthCallbackRequest;
import com.sallaemallae.backend.domain.auth.dto.OAuthCallbackResponse;
import com.sallaemallae.backend.domain.auth.dto.OAuthTermsAgreeRequest;
import com.sallaemallae.backend.domain.auth.dto.PasswordResetConfirmRequest;
import com.sallaemallae.backend.domain.auth.dto.PasswordResetRequestDto;
import com.sallaemallae.backend.domain.auth.dto.RefreshResponse;
import com.sallaemallae.backend.domain.auth.dto.SendCodeRequest;
import com.sallaemallae.backend.domain.auth.dto.SendCodeResponse;
import com.sallaemallae.backend.domain.auth.dto.SignupRequest;
import com.sallaemallae.backend.domain.auth.dto.SignupResponse;
import com.sallaemallae.backend.domain.auth.dto.TermAgreementDto;
import com.sallaemallae.backend.domain.auth.dto.VerifyCodeRequest;
import com.sallaemallae.backend.domain.auth.dto.VerifyCodeResponse;
import com.sallaemallae.backend.domain.auth.entity.LoginHistory;
import com.sallaemallae.backend.domain.auth.entity.PasswordHistory;
import com.sallaemallae.backend.domain.auth.entity.SocialAccount;
import com.sallaemallae.backend.domain.auth.entity.Terms;
import com.sallaemallae.backend.domain.auth.entity.User;
import com.sallaemallae.backend.domain.auth.entity.UserAgreement;
import com.sallaemallae.backend.domain.auth.enumtype.AuthProvider;
import com.sallaemallae.backend.domain.auth.enumtype.UserStatus;
import com.sallaemallae.backend.domain.auth.exception.AuthErrorCode;
import com.sallaemallae.backend.domain.auth.oauth.OAuthProviderClient;
import com.sallaemallae.backend.domain.auth.oauth.OAuthUserProfile;
import com.sallaemallae.backend.domain.auth.repository.LoginHistoryRepository;
import com.sallaemallae.backend.domain.auth.repository.PasswordHistoryRepository;
import com.sallaemallae.backend.domain.auth.repository.SocialAccountRepository;
import com.sallaemallae.backend.domain.auth.repository.TermsRepository;
import com.sallaemallae.backend.domain.auth.repository.UserAgreementRepository;
import com.sallaemallae.backend.domain.auth.repository.UserRepository;
import com.sallaemallae.backend.global.email.EmailService;
import com.sallaemallae.backend.global.exception.BusinessException;
import com.sallaemallae.backend.global.security.jwt.JwtProvider;
import com.sallaemallae.backend.global.security.jwt.RedisTokenService;
import com.sallaemallae.backend.global.security.ratelimit.RateLimitResult;
import com.sallaemallae.backend.global.security.ratelimit.RateLimitService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
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
  private static final int VERIFICATION_CODE_LENGTH = 6;
  private static final int VERIFICATION_CODE_EXPIRES_SECONDS = 300;  // 5분
  private static final int VERIFIED_TOKEN_EXPIRES_SECONDS = 600;  // 10분
  private static final int MAX_VERIFICATION_ATTEMPTS = 5;
  private static final int RECENT_PASSWORD_CHECK_COUNT = 3;
  // 타이밍 공격 방어: 존재하지 않는 유저에도 BCrypt 비교 시간 소비
  private static final String DUMMY_HASH = "$2a$10$dummyHashForTimingAttackDefense000000000000000000000";

  private final UserRepository userRepository;
  private final SocialAccountRepository socialAccountRepository;
  private final LoginHistoryRepository loginHistoryRepository;
  private final PasswordHistoryRepository passwordHistoryRepository;
  private final TermsRepository termsRepository;
  private final UserAgreementRepository userAgreementRepository;
  private final JwtProvider jwtProvider;
  private final RedisTokenService redisTokenService;
  private final PasswordEncoder passwordEncoder;
  private final EmailService emailService;
  private final ObjectMapper objectMapper;
  private final List<OAuthProviderClient> oauthProviderClients;
  private final PasswordValidator passwordValidator;
  private final RateLimitService rateLimitService;

  private static final int EMAIL_RATE_LIMIT = 3;
  private static final int EMAIL_RATE_WINDOW_SECONDS = 3600;  // 1시간

  private Map<AuthProvider, OAuthProviderClient> oauthClientMap;

  private final SecureRandom secureRandom = new SecureRandom();

  @PostConstruct
  void initOAuthClients() {
    oauthClientMap = new EnumMap<>(AuthProvider.class);
    for (OAuthProviderClient client : oauthProviderClients) {
      oauthClientMap.put(client.getProvider(), client);
    }
  }

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

    // 2. Find user by email (타이밍 공격 방어: 유저 유무와 관계없이 BCrypt 비교 수행)
    User user = userRepository.findByEmail(email).orElse(null);

    if (user == null) {
      passwordEncoder.matches(request.password(), DUMMY_HASH);
      throw new BusinessException(AuthErrorCode.LOGIN_INVALID_CREDENTIALS);
    }

    // 3. Check user status
    validateUserStatus(user);

    // 4. Validate password (BCrypt 비교)
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

    // 11. 이전 로그인 시간 조회
    OffsetDateTime lastLoginAt = loginHistoryRepository.findLastLoginAt(user.getId())
        .orElse(null);

    // 12. Build and return response
    return LoginResponse.of(
        accessToken,
        jwtProvider.getAccessTokenExpirationSeconds(),
        LoginResponse.UserInfo.from(user, provider, lastLoginAt)
    );
  }

  @Override
  @Transactional(readOnly = true)
  public CheckEmailResponse checkEmailDuplicate(String email) {
    boolean exists = userRepository.findByEmail(email).isPresent();
    return CheckEmailResponse.of(email, !exists);
  }

  @Override
  @Transactional
  public SendCodeResponse sendVerificationCode(SendCodeRequest request) {
    String email = request.email();
    String purpose = request.purpose();

    // 이메일당 Rate Limit 체크 (3회/시간)
    RateLimitResult emailRateResult = rateLimitService.checkEmailLimit(
        email, EMAIL_RATE_LIMIT, EMAIL_RATE_WINDOW_SECONDS);
    if (!emailRateResult.isAllowed()) {
      throw new BusinessException(AuthErrorCode.EMAIL_RATE_EXCEEDED);
    }

    // SIGNUP 목적일 경우 이미 가입된 이메일인지 확인
    if ("SIGNUP".equals(purpose) && userRepository.findByEmail(email).isPresent()) {
      throw new BusinessException(AuthErrorCode.EMAIL_ALREADY_EXISTS);
    }

    // 인증코드 생성
    String code = generateVerificationCode();
    String hashedCode = passwordEncoder.encode(code);

    // Redis에 저장
    redisTokenService.saveVerificationCode(purpose, email, hashedCode);

    // 이메일 발송
    if ("SIGNUP".equals(purpose)) {
      emailService.sendVerificationCode(email, code);
    } else {
      emailService.sendPasswordResetCode(email, code);
    }

    int remainingAttempts = redisTokenService.getRemainingVerificationAttempts(purpose, email);

    return SendCodeResponse.of(VERIFICATION_CODE_EXPIRES_SECONDS, remainingAttempts);
  }

  @Override
  @Transactional
  public VerifyCodeResponse verifyCode(VerifyCodeRequest request) {
    String email = request.email();
    String code = request.code();
    String purpose = request.purpose();

    // 시도 횟수 초과 확인
    if (redisTokenService.isVerificationAttemptsExceeded(purpose, email)) {
      throw new BusinessException(AuthErrorCode.VERIFY_ATTEMPTS_EXCEEDED);
    }

    // 인증코드 정보 조회
    String[] codeInfo = redisTokenService.getVerificationCode(purpose, email);
    if (codeInfo == null) {
      throw new BusinessException(AuthErrorCode.VERIFY_CODE_EXPIRED);
    }

    String hashedCode = codeInfo[0];

    // 시도 횟수 증가
    redisTokenService.incrementVerificationAttempts(purpose, email);

    // 인증코드 검증
    if (!passwordEncoder.matches(code, hashedCode)) {
      throw new BusinessException(AuthErrorCode.VERIFY_CODE_MISMATCH);
    }

    // 인증 성공 - 인증코드 삭제
    redisTokenService.deleteVerificationCode(purpose, email);

    // 인증 완료 토큰 생성 및 저장
    String verificationToken = "verify_" + UUID.randomUUID().toString().replace("-", "");
    redisTokenService.saveVerifiedToken(purpose, verificationToken, email);

    return VerifyCodeResponse.of(verificationToken, VERIFIED_TOKEN_EXPIRES_SECONDS);
  }

  @Override
  @Transactional
  public SignupResponse signup(SignupRequest request, String deviceId, String userAgent,
      String ipAddress, HttpServletResponse response) {

    String verificationToken = request.verificationToken();
    String email = request.email();

    // 1. 인증 토큰 검증 및 소비
    String verifiedEmail = redisTokenService.consumeVerifiedToken("SIGNUP", verificationToken);
    if (verifiedEmail == null || !verifiedEmail.equals(email)) {
      throw new BusinessException(AuthErrorCode.SIGNUP_TOKEN_INVALID);
    }

    // 2. 이메일 중복 체크 (다시 한번)
    if (userRepository.findByEmail(email).isPresent()) {
      throw new BusinessException(AuthErrorCode.EMAIL_ALREADY_EXISTS);
    }

    // 3. 필수 약관 동의 확인
    List<Long> requiredTermsIds = termsRepository.findActiveRequiredTermsIds();
    Set<Long> agreedTermsIds = request.agreements().stream()
        .filter(TermAgreementDto::agreed)
        .map(TermAgreementDto::termsId)
        .collect(Collectors.toSet());

    for (Long requiredId : requiredTermsIds) {
      if (!agreedTermsIds.contains(requiredId)) {
        throw new BusinessException(AuthErrorCode.SIGNUP_REQUIRED_TERMS_NOT_AGREED);
      }
    }

    // 4. 비밀번호 정책 검증
    PasswordValidator.ValidationResult validationResult = passwordValidator.validate(request.password(), email);
    if (!validationResult.valid()) {
      throw new BusinessException(AuthErrorCode.PWD_POLICY_VIOLATION);
    }

    // 5. 사용자 생성 (비밀번호 해시)
    String passwordHash = passwordEncoder.encode(request.password());
    User user = User.createEmailUser(
        email,
        passwordHash,
        request.nickname(),
        request.emailOptIn()
    );
    userRepository.save(user);

    // 5. 약관 동의 저장
    List<UserAgreement> agreements = request.agreements().stream()
        .map(dto -> UserAgreement.create(user.getId(), dto.termsId(), dto.agreed()))
        .toList();
    userAgreementRepository.saveAll(agreements);

    // 6. 비밀번호 이력 저장
    passwordHistoryRepository.save(
        PasswordHistory.createInitial(user.getId(), passwordHash, ipAddress)
    );

    // 7. 회원가입 이력 저장
    loginHistoryRepository.save(
        LoginHistory.signup(user.getId(), email, ipAddress, userAgent)
    );

    // 8. 토큰 생성
    String role = "USER";
    String accessToken = jwtProvider.createAccessToken(
        user.getId(), role, user.getTokenVersion(), deviceId);
    String refreshToken = jwtProvider.createRefreshToken(user.getId(), deviceId);

    // 11. Refresh Token 저장
    redisTokenService.saveRefreshToken(user.getId(), deviceId, refreshToken);

    // 12. Refresh Token 쿠키 설정
    setRefreshTokenCookie(response, refreshToken);

    log.info("New user registered: {}", email);

    return SignupResponse.of(accessToken, jwtProvider.getAccessTokenExpirationSeconds(), user);
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
  @Transactional
  public SendCodeResponse requestPasswordReset(PasswordResetRequestDto request) {
    String email = request.email();

    // 열거 방어: 가입 여부와 무관하게 동일한 200 응답 반환
    // 실제 메일은 가입된 사용자에게만 Async 발송
    User user = userRepository.findByEmail(email).orElse(null);

    if (user != null) {
      String code = generateVerificationCode();
      String hashedCode = passwordEncoder.encode(code);
      redisTokenService.saveVerificationCode("PASSWORD_RESET", email, hashedCode);
      emailService.sendPasswordResetCode(email, code);
    }

    return SendCodeResponse.of(VERIFICATION_CODE_EXPIRES_SECONDS, MAX_VERIFICATION_ATTEMPTS);
  }

  @Override
  @Transactional
  public void resetPassword(PasswordResetConfirmRequest request, String ipAddress) {
    String email = request.email();
    String verificationToken = request.verificationToken();
    String newPassword = request.newPassword();

    // 1. 인증 토큰 검증 및 소비
    String verifiedEmail = redisTokenService.consumeVerifiedToken("PASSWORD_RESET", verificationToken);
    if (verifiedEmail == null || !verifiedEmail.equals(email)) {
      throw new BusinessException(AuthErrorCode.PWD_TOKEN_INVALID);
    }

    // 2. 사용자 조회
    User user = userRepository.findByEmail(email)
        .orElseThrow(() -> new BusinessException(AuthErrorCode.PWD_TOKEN_INVALID));

    // 3. 비밀번호 정책 검증
    PasswordValidator.ValidationResult validationResult = passwordValidator.validate(newPassword, email);
    if (!validationResult.valid()) {
      throw new BusinessException(AuthErrorCode.PWD_POLICY_VIOLATION);
    }

    // 4. 최근 3개 비밀번호 재사용 확인
    checkRecentPasswordReuse(user.getId(), newPassword);

    // 5. 비밀번호 해시 및 변경
    String hashedPassword = passwordEncoder.encode(newPassword);
    user.changePassword(hashedPassword);

    // 5. 토큰 버전 증가 (기존 모든 토큰 무효화)
    user.incrementTokenVersion();

    // 6. 모든 Refresh Token 삭제
    redisTokenService.deleteAllRefreshTokens(user.getId());

    // 7. 로그인 실패 카운터 삭제 (잠금 해제)
    redisTokenService.deleteLoginFailCount(email);

    // 9. 비밀번호 이력 저장
    passwordHistoryRepository.save(
        PasswordHistory.changedByReset(user.getId(), hashedPassword, ipAddress)
    );

    // 9. 이벤트 기록
    loginHistoryRepository.save(
        LoginHistory.passwordReset(user.getId(), email, ipAddress)
    );

    log.info("Password reset completed for user {}", user.getId());
  }

  @Override
  @Transactional(readOnly = true)
  public String getOAuthStartUrl(String provider) {
    AuthProvider authProvider = parseProvider(provider);
    String state = UUID.randomUUID().toString();
    redisTokenService.saveOAuthState(state, authProvider.name());
    return "/api/auth/" + provider + "/callback?state=" + state;
  }

  @Override
  @Transactional
  public OAuthCallbackResponse oauthCallback(String provider, OAuthCallbackRequest request,
      String deviceId, String userAgent, String ipAddress, HttpServletResponse response) {

    // 1. Provider 파싱
    AuthProvider authProvider = parseProvider(provider);

    // 2. CSRF state 검증 + provider 일치 확인
    String storedProvider = redisTokenService.consumeOAuthState(request.state());
    if (storedProvider == null || !storedProvider.equals(authProvider.name())) {
      throw new BusinessException(AuthErrorCode.OAUTH_STATE_MISMATCH);
    }

    // 3. Provider에서 사용자 프로필 조회
    OAuthProviderClient client = oauthClientMap.get(authProvider);
    OAuthUserProfile profile = client.getUserProfile(request.authorizationCode());

    // 4. 기존 소셜 계정 조회
    return socialAccountRepository
        .findByProviderAndProviderAccountId(authProvider, profile.providerAccountId())
        .map(socialAccount -> handleExistingUser(socialAccount, authProvider, deviceId, userAgent,
            ipAddress, response))
        .orElseGet(() -> handleNewUser(profile, authProvider));
  }

  @Override
  @Transactional
  public LoginResponse oauthTermsAgree(OAuthTermsAgreeRequest request,
      String deviceId, String userAgent, String ipAddress, HttpServletResponse response) {

    // 1. 임시 토큰 소비
    String json = redisTokenService.consumeTempToken(request.tempToken());
    if (json == null) {
      throw new BusinessException(AuthErrorCode.OAUTH_TEMP_TOKEN_INVALID);
    }

    // 2. 임시 데이터 역직렬화
    Map<String, String> tempData;
    try {
      tempData = objectMapper.readValue(json, Map.class);
    } catch (JsonProcessingException e) {
      throw new BusinessException(AuthErrorCode.OAUTH_TEMP_TOKEN_INVALID);
    }

    String email = tempData.get("email");
    String profileImageUrl = tempData.get("profileImageUrl");
    AuthProvider authProvider = AuthProvider.valueOf(tempData.get("provider"));
    String providerAccountId = tempData.get("providerAccountId");

    // 3. 필수 약관 검증
    List<Long> requiredTermsIds = termsRepository.findActiveRequiredTermsIds();
    Set<Long> agreedTermsIds = request.agreements().stream()
        .filter(TermAgreementDto::agreed)
        .map(TermAgreementDto::termsId)
        .collect(Collectors.toSet());

    for (Long requiredId : requiredTermsIds) {
      if (!agreedTermsIds.contains(requiredId)) {
        throw new BusinessException(AuthErrorCode.SIGNUP_REQUIRED_TERMS_NOT_AGREED);
      }
    }

    // 4. 사용자 생성
    User user = User.createSocialUser(email, request.nickname(), profileImageUrl,
        request.emailOptIn());
    userRepository.save(user);

    // 5. 소셜 계정 연동
    socialAccountRepository.save(
        SocialAccount.create(user.getId(), authProvider, providerAccountId));

    // 6. 약관 동의 저장
    List<UserAgreement> agreements = request.agreements().stream()
        .map(dto -> UserAgreement.create(user.getId(), dto.termsId(), dto.agreed()))
        .toList();
    userAgreementRepository.saveAll(agreements);

    // 7. 로그인 이력 저장
    loginHistoryRepository.save(
        LoginHistory.socialLoginSuccess(user.getId(), email, ipAddress, userAgent));

    // 8. 토큰 생성
    String role = "USER";
    String accessToken = jwtProvider.createAccessToken(
        user.getId(), role, user.getTokenVersion(), deviceId);
    String refreshToken = jwtProvider.createRefreshToken(user.getId(), deviceId);

    redisTokenService.saveRefreshToken(user.getId(), deviceId, refreshToken);
    setRefreshTokenCookie(response, refreshToken);

    log.info("New social user registered: {} via {}", email, authProvider);

    return LoginResponse.of(
        accessToken,
        jwtProvider.getAccessTokenExpirationSeconds(),
        LoginResponse.UserInfo.from(user, authProvider, OffsetDateTime.now())
    );
  }

  private OAuthCallbackResponse handleExistingUser(SocialAccount socialAccount,
      AuthProvider authProvider, String deviceId, String userAgent, String ipAddress,
      HttpServletResponse response) {

    User user = userRepository.findById(socialAccount.getUserId())
        .orElseThrow(() -> new BusinessException(AuthErrorCode.AUTH_UNAUTHORIZED));

    // 탈퇴 상태이면 복구
    if (user.getStatus() == UserStatus.WITHDRAWN) {
      OffsetDateTime withdrawnAt = user.getWithdrawnAt();
      if (withdrawnAt != null) {
        long days = ChronoUnit.DAYS.between(withdrawnAt, OffsetDateTime.now());
        if (days > RECOVERY_PERIOD_DAYS) {
          throw new BusinessException(AuthErrorCode.LOGIN_WITHDRAWN_EXPIRED);
        }
      }
      user.recover();
    } else if (user.getStatus() != UserStatus.ACTIVE) {
      throw new BusinessException(AuthErrorCode.LOGIN_ACCOUNT_BANNED);
    }

    // 토큰 생성
    String role = user.isAdmin() ? "ADMIN" : "USER";
    String accessToken = jwtProvider.createAccessToken(
        user.getId(), role, user.getTokenVersion(), deviceId);
    String refreshToken = jwtProvider.createRefreshToken(user.getId(), deviceId);

    redisTokenService.saveRefreshToken(user.getId(), deviceId, refreshToken);
    setRefreshTokenCookie(response, refreshToken);

    loginHistoryRepository.save(
        LoginHistory.socialLoginSuccess(user.getId(), user.getEmail(), ipAddress, userAgent));

    return OAuthCallbackResponse.existingUser(
        accessToken,
        jwtProvider.getAccessTokenExpirationSeconds(),
        LoginResponse.UserInfo.from(user, authProvider, OffsetDateTime.now())
    );
  }

  private OAuthCallbackResponse handleNewUser(OAuthUserProfile profile,
      AuthProvider authProvider) {

    // 이미 이메일 가입된 사용자인지 확인
    if (userRepository.findByEmail(profile.email()).isPresent()) {
      throw new BusinessException(AuthErrorCode.OAUTH_EMAIL_ALREADY_EXISTS);
    }

    // 임시 토큰 생성 및 Redis 저장
    String tempToken = "temp_" + UUID.randomUUID().toString().replace("-", "");
    try {
      String json = objectMapper.writeValueAsString(Map.of(
          "email", profile.email(),
          "nickname", profile.nickname() != null ? profile.nickname() : "",
          "profileImageUrl", profile.profileImageUrl() != null ? profile.profileImageUrl() : "",
          "provider", authProvider.name(),
          "providerAccountId", profile.providerAccountId()
      ));
      redisTokenService.saveTempToken(tempToken, json);
    } catch (JsonProcessingException e) {
      throw new BusinessException(AuthErrorCode.OAUTH_PROVIDER_ERROR);
    }

    // 약관 목록 조회
    List<Terms> activeTerms = termsRepository.findActiveTerms();
    List<OAuthCallbackResponse.TermsDto> requiredTerms = activeTerms.stream()
        .filter(Terms::isRequired)
        .map(t -> OAuthCallbackResponse.TermsDto.builder()
            .termsId(t.getId()).title(t.getTitle()).required(true).build())
        .toList();
    List<OAuthCallbackResponse.TermsDto> optionalTerms = activeTerms.stream()
        .filter(t -> !t.isRequired())
        .map(t -> OAuthCallbackResponse.TermsDto.builder()
            .termsId(t.getId()).title(t.getTitle()).required(false).build())
        .toList();

    return OAuthCallbackResponse.newUser(
        tempToken, profile.email(), authProvider.name(), requiredTerms, optionalTerms);
  }

  private AuthProvider parseProvider(String provider) {
    try {
      AuthProvider authProvider = AuthProvider.valueOf(provider.toUpperCase());
      if (authProvider == AuthProvider.EMAIL) {
        throw new BusinessException(AuthErrorCode.OAUTH_UNSUPPORTED_PROVIDER);
      }
      return authProvider;
    } catch (IllegalArgumentException e) {
      throw new BusinessException(AuthErrorCode.OAUTH_UNSUPPORTED_PROVIDER);
    }
  }

  private void checkRecentPasswordReuse(Long userId, String newPassword) {
    // 현재 비밀번호 포함 최근 3개와 비교 (BCrypt로 비교)
    List<PasswordHistory> recentPasswords =
        passwordHistoryRepository.findRecentByUserId(userId, RECENT_PASSWORD_CHECK_COUNT);
    for (PasswordHistory ph : recentPasswords) {
      if (passwordEncoder.matches(newPassword, ph.getPasswordHash())) {
        throw new BusinessException(AuthErrorCode.PWD_RECENT_REUSE);
      }
    }
  }

  private String generateVerificationCode() {
    int code = secureRandom.nextInt(900000) + 100000;  // 100000 ~ 999999
    return String.valueOf(code);
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
