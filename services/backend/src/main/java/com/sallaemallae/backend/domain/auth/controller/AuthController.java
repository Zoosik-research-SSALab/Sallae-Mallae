package com.sallaemallae.backend.domain.auth.controller;

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
import com.sallaemallae.backend.domain.auth.dto.VerifyCodeRequest;
import com.sallaemallae.backend.domain.auth.dto.VerifyCodeResponse;
import com.sallaemallae.backend.domain.auth.service.AuthService;
import com.sallaemallae.backend.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Auth", description = "인증 API")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  @Operation(summary = "인증 상태 확인", description = "현재 인증 상태를 반환합니다.")
  @GetMapping("/status")
  public ApiResponse<AuthStatusResponse> status() {
    return ApiResponse.success(authService.getAuthStatus());
  }

  @Operation(summary = "로그인", description = "이메일과 비밀번호로 로그인합니다. Access Token은 응답 바디에, Refresh Token은 HttpOnly 쿠키로 반환됩니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "로그인 성공"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "인증 실패")
  })
  @PostMapping("/login")
  public ApiResponse<LoginResponse> login(
      @Valid @RequestBody LoginRequest request,
      @Parameter(description = "기기 고유 식별자", required = true) @RequestHeader("X-Device-Id") String deviceId,
      @Parameter(description = "User-Agent 헤더") @RequestHeader(value = "User-Agent", defaultValue = "Unknown") String userAgent,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {

    String ipAddress = getClientIpAddress(httpRequest);
    LoginResponse loginResponse = authService.login(request, deviceId, userAgent, ipAddress,
        response);
    return ApiResponse.success(loginResponse);
  }

  @Operation(summary = "이메일 중복 확인", description = "이메일 주소의 사용 가능 여부를 확인합니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "확인 완료")
  })
  @GetMapping("/check-email/{email}")
  public ApiResponse<CheckEmailResponse> checkEmail(
      @Parameter(description = "확인할 이메일 주소", required = true) @PathVariable String email) {
    return ApiResponse.success(authService.checkEmailDuplicate(email));
  }

  @Operation(summary = "인증코드 발송", description = "이메일로 6자리 인증코드를 발송합니다. 5분간 유효하며 최대 5회까지 검증 시도 가능합니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "인증코드 발송 성공"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "이미 가입된 이메일")
  })
  @PostMapping("/email/send-code")
  public ApiResponse<SendCodeResponse> sendCode(@Valid @RequestBody SendCodeRequest request) {
    return ApiResponse.success(authService.sendVerificationCode(request));
  }

  @Operation(summary = "인증코드 검증", description = "발송된 인증코드를 검증합니다. 성공 시 10분간 유효한 verificationToken을 반환합니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "인증 성공"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "인증코드 불일치/만료/시도 횟수 초과")
  })
  @PostMapping("/email/verify-code")
  public ApiResponse<VerifyCodeResponse> verifyCode(@Valid @RequestBody VerifyCodeRequest request) {
    return ApiResponse.success(authService.verifyCode(request));
  }

  @Operation(summary = "회원가입", description = "이메일 인증 완료 후 회원가입을 진행합니다. verificationToken, 비밀번호, 닉네임, 약관 동의가 필요합니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "회원가입 성공"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "인증 토큰 유효하지 않음/비밀번호 정책 위반/필수 약관 미동의")
  })
  @PostMapping("/signup")
  @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<SignupResponse> signup(
      @Valid @RequestBody SignupRequest request,
      @Parameter(description = "기기 고유 식별자", required = true) @RequestHeader("X-Device-Id") String deviceId,
      @Parameter(description = "User-Agent 헤더") @RequestHeader(value = "User-Agent", defaultValue = "Unknown") String userAgent,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {

    String ipAddress = getClientIpAddress(httpRequest);
    SignupResponse signupResponse = authService.signup(request, deviceId, userAgent, ipAddress,
        response);
    return ApiResponse.success(signupResponse);
  }

  @Operation(summary = "로그아웃", description = "현재 세션을 종료하고 토큰을 무효화합니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "로그아웃 성공"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "인증 필요")
  })
  @PostMapping("/logout")
  public ApiResponse<Void> logout(
      @Parameter(description = "Bearer {accessToken}", required = true) @RequestHeader("Authorization") String authorization,
      @Parameter(description = "기기 고유 식별자", required = true) @RequestHeader("X-Device-Id") String deviceId,
      HttpServletResponse response) {

    String accessToken = extractAccessToken(authorization);
    authService.logout(accessToken, deviceId, response);
    return ApiResponse.success();
  }

  @Operation(summary = "토큰 갱신", description = "Refresh Token(쿠키)을 사용하여 새로운 Access Token을 발급받습니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "토큰 갱신 성공"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Refresh Token 없음/만료")
  })
  @PostMapping("/refresh")
  public ApiResponse<RefreshResponse> refresh(
      @Parameter(description = "기기 고유 식별자", required = true) @RequestHeader("X-Device-Id") String deviceId,
      HttpServletRequest request,
      HttpServletResponse response) {

    RefreshResponse refreshResponse = authService.refresh(request, deviceId, response);
    return ApiResponse.success(refreshResponse);
  }

  @Operation(summary = "비밀번호 찾기 - 인증코드 발송", description = "비밀번호 재설정을 위한 인증코드를 이메일로 발송합니다. 가입된 이메일만 가능합니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "인증코드 발송 성공"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "가입되지 않은 이메일")
  })
  @PostMapping("/password/reset-request")
  public ApiResponse<SendCodeResponse> requestPasswordReset(
      @Valid @RequestBody PasswordResetRequestDto request) {
    return ApiResponse.success(authService.requestPasswordReset(request));
  }

  @Operation(summary = "비밀번호 재설정", description = "이메일 인증 완료 후 새 비밀번호로 재설정합니다. 기존 모든 세션이 무효화됩니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "비밀번호 재설정 성공"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "인증 토큰 유효하지 않음/비밀번호 정책 위반")
  })
  @PostMapping("/password/reset")
  public ApiResponse<Void> resetPassword(
      @Valid @RequestBody PasswordResetConfirmRequest request,
      HttpServletRequest httpRequest) {
    String ipAddress = getClientIpAddress(httpRequest);
    authService.resetPassword(request, ipAddress);
    return ApiResponse.success();
  }

  @Operation(summary = "OAuth 시작", description = "소셜 로그인을 위한 OAuth 인증 URL을 반환합니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "OAuth URL 반환")
  })
  @GetMapping("/oauth/{provider}/start")
  public ApiResponse<Map<String, String>> oauthStart(
      @Parameter(description = "OAuth 제공자 (kakao, naver, google)", required = true) @PathVariable String provider) {
    return ApiResponse.success(
        Map.of("provider", provider, "redirect", authService.getOAuthStartUrl(provider)));
  }

  @Operation(summary = "소셜 로그인", description = "소셜 로그인/회원가입을 처리합니다. 기존 회원이면 로그인, 신규 회원이면 약관 동의를 요청합니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "로그인 성공 또는 약관 동의 필요"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "인가 코드 무효/state 불일치"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "이미 다른 방식으로 가입된 이메일"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "502", description = "Provider 통신 실패")
  })
  @PostMapping("/{provider}/callback")
  public ApiResponse<OAuthCallbackResponse> oauthCallback(
      @Parameter(description = "OAuth 제공자 (google, naver, kakao)", required = true) @PathVariable String provider,
      @Valid @RequestBody OAuthCallbackRequest request,
      @Parameter(description = "기기 고유 식별자", required = true) @RequestHeader("X-Device-Id") String deviceId,
      @Parameter(description = "User-Agent 헤더") @RequestHeader(value = "User-Agent", defaultValue = "Unknown") String userAgent,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {

    String ipAddress = getClientIpAddress(httpRequest);
    OAuthCallbackResponse callbackResponse = authService.oauthCallback(
        provider, request, deviceId, userAgent, ipAddress, response);
    return ApiResponse.success(callbackResponse);
  }

  @Operation(summary = "소셜 회원가입 약관 동의", description = "소셜 로그인 신규 회원의 약관 동의를 처리하고 회원가입을 완료합니다.")
  @ApiResponses({
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "회원가입 성공"),
      @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "임시 토큰 무효/필수 약관 미동의")
  })
  @PostMapping("/policy")
  @ResponseStatus(HttpStatus.CREATED)
  public ApiResponse<LoginResponse> oauthTermsAgree(
      @Valid @RequestBody OAuthTermsAgreeRequest request,
      @Parameter(description = "기기 고유 식별자", required = true) @RequestHeader("X-Device-Id") String deviceId,
      @Parameter(description = "User-Agent 헤더") @RequestHeader(value = "User-Agent", defaultValue = "Unknown") String userAgent,
      HttpServletRequest httpRequest,
      HttpServletResponse response) {

    String ipAddress = getClientIpAddress(httpRequest);
    LoginResponse loginResponse = authService.oauthTermsAgree(
        request, deviceId, userAgent, ipAddress, response);
    return ApiResponse.success(loginResponse);
  }

  private String extractAccessToken(String authorization) {
    if (authorization != null && authorization.startsWith("Bearer ")) {
      return authorization.substring(7);
    }
    return authorization;
  }

  private String getClientIpAddress(HttpServletRequest request) {
    String xForwardedFor = request.getHeader("X-Forwarded-For");
    if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
      return xForwardedFor.split(",")[0].trim();
    }
    String xRealIp = request.getHeader("X-Real-IP");
    if (xRealIp != null && !xRealIp.isEmpty()) {
      return xRealIp;
    }
    return request.getRemoteAddr();
  }
}
