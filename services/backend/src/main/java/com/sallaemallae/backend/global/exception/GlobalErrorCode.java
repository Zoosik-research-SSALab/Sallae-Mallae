package com.sallaemallae.backend.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GlobalErrorCode implements ErrorCode {

  INVALID_INPUT_VALUE(400, "GLOBAL_001", "유효하지 않은 입력값입니다."),
  UNAUTHORIZED(401, "GLOBAL_002", "인증이 필요합니다."),
  FORBIDDEN(403, "GLOBAL_003", "접근 권한이 없습니다."),
  NOT_FOUND(404, "GLOBAL_004", "요청한 리소스를 찾을 수 없습니다."),
  CONFLICT(409, "GLOBAL_005", "이미 존재하는 데이터입니다."),
  INTERNAL_SERVER_ERROR(500, "GLOBAL_006", "서버 내부 오류입니다.");

  private final int status;
  private final String code;
  private final String message;
}
