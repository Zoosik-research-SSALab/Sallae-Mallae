package com.sallaemallae.backend.infra.kis;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;

@Getter
public class KisApiException extends RuntimeException implements ErrorCode {

  private final int status;
  private final String code;

  public KisApiException(int status, String code, String message) {
    super(message);
    this.status = status;
    this.code = code;
  }

  public KisApiException(int status, String code, String message, Throwable cause) {
    super(message, cause);
    this.status = status;
    this.code = code;
  }
}
