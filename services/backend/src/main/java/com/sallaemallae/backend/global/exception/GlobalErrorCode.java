package com.sallaemallae.backend.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GlobalErrorCode implements ErrorCode {

  INVALID_INPUT_VALUE(400, "GLOBAL_001", "유효하지 않은 입력값입니다."),
  INTERNAL_SERVER_ERROR(500, "GLOBAL_002", "서버 내부 오류입니다.");

  private final int status;
  private final String code;
  private final String message;
}
