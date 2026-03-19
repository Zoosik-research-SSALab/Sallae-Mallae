package com.sallaemallae.backend.domain.storage.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;

public enum StorageErrorCode implements ErrorCode {

  PRESIGNED_URL_FAILED(500, "STORAGE_001", "presigned URL 생성에 실패했습니다."),
  INVALID_FILE_TYPE(400, "STORAGE_002", "허용되지 않는 파일 형식입니다.");

  private final int status;
  private final String code;
  private final String message;

  StorageErrorCode(int status, String code, String message) {
    this.status = status;
    this.code = code;
    this.message = message;
  }

  @Override
  public int getStatus() {
    return status;
  }

  @Override
  public String getCode() {
    return code;
  }

  @Override
  public String getMessage() {
    return message;
  }
}
