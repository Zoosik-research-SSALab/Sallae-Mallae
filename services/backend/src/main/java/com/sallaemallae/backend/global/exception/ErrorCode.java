package com.sallaemallae.backend.global.exception;

public interface ErrorCode {

  int getStatus();

  String getCode();

  String getMessage();
}
