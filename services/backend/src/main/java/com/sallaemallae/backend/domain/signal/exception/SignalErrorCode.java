package com.sallaemallae.backend.domain.signal.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SignalErrorCode implements ErrorCode {

  SIGNAL_NOT_FOUND(404, "SIGNAL_001", "매매 신호 정보를 찾을 수 없습니다.");

  private final int status;
  private final String code;
  private final String message;
}
