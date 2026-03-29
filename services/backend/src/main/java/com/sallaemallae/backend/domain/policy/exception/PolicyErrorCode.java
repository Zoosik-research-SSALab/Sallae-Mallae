package com.sallaemallae.backend.domain.policy.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PolicyErrorCode implements ErrorCode {

  POLICY_NOT_FOUND(404, "POLICY_001", "약관 정보를 찾을 수 없습니다.");

  private final int status;
  private final String code;
  private final String message;
}
