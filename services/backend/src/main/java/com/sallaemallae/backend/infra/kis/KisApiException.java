package com.sallaemallae.backend.infra.kis;

import lombok.Getter;

@Getter
public class KisApiException extends RuntimeException {

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
