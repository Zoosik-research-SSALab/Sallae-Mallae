package com.sallaemallae.backend.domain.auth.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AuthErrorCode implements ErrorCode {

  // 인증 관련
  AUTH_UNAUTHORIZED(401, "AUTH_001", "인증 정보가 유효하지 않습니다."),
  AUTH_FORBIDDEN(403, "AUTH_002", "접근 권한이 없습니다."),

  // 로그인 관련
  LOGIN_INVALID_CREDENTIALS(401, "LOGIN_001", "이메일 또는 비밀번호가 올바르지 않습니다."),
  LOGIN_ACCOUNT_LOCKED(423, "LOGIN_002", "계정이 일시적으로 잠겼습니다."),
  LOGIN_WITHDRAWN_RECOVERABLE(403, "LOGIN_003", "탈퇴 처리 중인 계정입니다. 복구하시겠습니까?"),
  LOGIN_WITHDRAWN_EXPIRED(410, "LOGIN_004", "복구 기간이 만료된 계정입니다."),
  LOGIN_ACCOUNT_BANNED(403, "LOGIN_005", "정지된 계정입니다."),

  // 토큰 관련
  TOKEN_REFRESH_EXPIRED(401, "TOKEN_001", "리프레시 토큰이 만료되었습니다."),
  TOKEN_ALREADY_USED(401, "TOKEN_002", "이미 사용된 토큰입니다."),
  TOKEN_DEVICE_MISMATCH(401, "TOKEN_003", "기기 정보가 일치하지 않습니다."),
  TOKEN_VERSION_MISMATCH(401, "TOKEN_004", "토큰 버전이 일치하지 않습니다."),

  // 이메일
  EMAIL_ALREADY_EXISTS(409, "EMAIL_001", "이미 가입된 이메일입니다."),

  // 인증코드
  VERIFY_CODE_MISMATCH(400, "VERIFY_001", "인증코드가 일치하지 않습니다."),
  VERIFY_CODE_EXPIRED(400, "VERIFY_002", "인증코드가 만료되었습니다."),
  VERIFY_ATTEMPTS_EXCEEDED(400, "VERIFY_003", "인증 시도 횟수를 초과했습니다."),

  // 회원가입
  SIGNUP_TOKEN_INVALID(400, "SIGNUP_001", "인증 토큰이 유효하지 않습니다."),
  SIGNUP_PASSWORD_POLICY_VIOLATION(400, "SIGNUP_002", "비밀번호 정책을 위반했습니다."),
  SIGNUP_REQUIRED_TERMS_NOT_AGREED(400, "SIGNUP_003", "필수 약관에 동의해야 합니다."),

  // OAuth 관련
  OAUTH_INVALID_AUTH_CODE(400, "OAUTH_001", "유효하지 않은 인가 코드입니다."),
  OAUTH_INVALID_REDIRECT_URI(400, "OAUTH_002", "허용되지 않은 Redirect URI입니다."),
  OAUTH_STATE_MISMATCH(400, "OAUTH_003", "state 값이 일치하지 않습니다."),
  OAUTH_UNSUPPORTED_PROVIDER(400, "OAUTH_004", "지원하지 않는 Provider입니다."),
  OAUTH_EMAIL_ALREADY_EXISTS(409, "OAUTH_005", "이미 다른 방식으로 가입된 이메일입니다."),
  OAUTH_PROVIDER_ERROR(502, "OAUTH_006", "Provider 서버와의 통신에 실패했습니다."),
  OAUTH_TEMP_TOKEN_INVALID(400, "OAUTH_007", "임시 토큰이 유효하지 않습니다.");

  private final int status;
  private final String code;
  private final String message;
}
