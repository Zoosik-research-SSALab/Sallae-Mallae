package com.sallaemallae.backend.domain.auth.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AuthErrorCode implements ErrorCode {

  AUTH_UNAUTHORIZED(401, "AUTH_001", "인증 정보가 유효하지 않습니다."),
  AUTH_FORBIDDEN(403, "AUTH_002", "접근 권한이 없습니다.");

  private final int status;
  private final String code;
  private final String message;
}
