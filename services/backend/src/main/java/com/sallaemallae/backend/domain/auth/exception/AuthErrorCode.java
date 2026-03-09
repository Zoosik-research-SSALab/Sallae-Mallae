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
  TOKEN_VERSION_MISMATCH(401, "TOKEN_004", "토큰 버전이 일치하지 않습니다.");

  private final int status;
  private final String code;
  private final String message;
}
