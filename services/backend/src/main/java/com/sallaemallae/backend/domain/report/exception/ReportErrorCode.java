package com.sallaemallae.backend.domain.report.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ReportErrorCode implements ErrorCode {

  REPORT_NOT_FOUND(404, "REPORT_001", "리포트를 찾을 수 없습니다."),
  REPORT_INPUT_INVALID(400, "REPORT_002", "리포트 요청 값이 올바르지 않습니다.");

  private final int status;
  private final String code;
  private final String message;
}
