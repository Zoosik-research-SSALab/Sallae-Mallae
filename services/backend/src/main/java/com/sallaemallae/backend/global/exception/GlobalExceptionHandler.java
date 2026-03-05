package com.sallaemallae.backend.global.exception;

import com.sallaemallae.backend.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(BusinessException.class)
  public ResponseEntity<ApiResponse<?>> handleBusinessException(BusinessException e) {
    ErrorCode errorCode = e.getErrorCode();
    return ResponseEntity
        .status(errorCode.getStatus())
        .body(ApiResponse.fail(errorCode));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<?>> handleValidException(MethodArgumentNotValidException e) {
    return ResponseEntity
        .status(400)
        .body(ApiResponse.fail(GlobalErrorCode.INVALID_INPUT_VALUE));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<?>> handleException(Exception e) {
    return ResponseEntity
        .status(500)
        .body(ApiResponse.fail(GlobalErrorCode.INTERNAL_SERVER_ERROR));
  }
}
