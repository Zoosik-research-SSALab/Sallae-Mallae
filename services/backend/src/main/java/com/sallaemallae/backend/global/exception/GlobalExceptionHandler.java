package com.sallaemallae.backend.global.exception;

import com.sallaemallae.backend.global.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(BusinessException.class)
  public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException ex) {
    return ResponseEntity
        .status(ex.getErrorCode().getStatus())
        .body(ApiResponse.fail(ex.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException ex) {
    return ResponseEntity
        .badRequest()
        .body(ApiResponse.fail(ex.getBindingResult().getAllErrors().get(0).getDefaultMessage()));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleException(Exception ex) {
    return ResponseEntity
        .internalServerError()
        .body(ApiResponse.fail(ErrorCode.INTERNAL_ERROR.getMessage()));
  }
}
