package com.sallaemallae.backend.global.exception;

import com.sallaemallae.backend.global.response.ApiResponse;
import com.sallaemallae.backend.infra.kis.KisApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  // 비즈니스 예외 (도메인별 상태코드 그대로 반환 - 401, 403, 404, 409 포함)
  @ExceptionHandler(BusinessException.class)
  public ResponseEntity<ApiResponse<?>> handleBusinessException(BusinessException e) {
    ErrorCode errorCode = e.getErrorCode();
    return ResponseEntity
        .status(errorCode.getStatus())
        .body(ApiResponse.fail(errorCode));
  }

  @ExceptionHandler(KisApiException.class)
  public ResponseEntity<ApiResponse<?>> handleKisApiException(KisApiException e) {
    log.error("KIS API error. code={}, status={}, message={}", e.getCode(), e.getStatus(), e.getMessage(), e);
    return ResponseEntity
        .status(e.getStatus())
        .body(ApiResponse.fail(e));
  }

  // 400 - @Valid 유효성 검증 실패
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<?>> handleValidException(MethodArgumentNotValidException e) {
    log.error("Validation error: {}", e.getBindingResult().getAllErrors());
    return ResponseEntity
        .status(400)
        .body(ApiResponse.fail(GlobalErrorCode.INVALID_INPUT_VALUE));
  }

  // 400 - 필수 요청 헤더 누락
  @ExceptionHandler(MissingRequestHeaderException.class)
  public ResponseEntity<ApiResponse<?>> handleMissingHeader(MissingRequestHeaderException e) {
    log.error("Missing header: {}", e.getHeaderName());
    return ResponseEntity
        .status(400)
        .body(ApiResponse.fail(GlobalErrorCode.INVALID_INPUT_VALUE));
  }

  // 400 - 필수 요청 파라미터 누락
  @ExceptionHandler(MissingServletRequestParameterException.class)
  public ResponseEntity<ApiResponse<?>> handleMissingParam(MissingServletRequestParameterException e) {
    log.error("Missing param: {}", e.getParameterName());
    return ResponseEntity
        .status(400)
        .body(ApiResponse.fail(GlobalErrorCode.INVALID_INPUT_VALUE));
  }

  // 400 - 요청 바디 파싱 실패 (잘못된 JSON 등)
  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiResponse<?>> handleNotReadable(HttpMessageNotReadableException e) {
    log.error("Message not readable: {}", e.getMessage());
    return ResponseEntity
        .status(400)
        .body(ApiResponse.fail(GlobalErrorCode.INVALID_INPUT_VALUE));
  }

  // 404 - 존재하지 않는 엔드포인트
  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<ApiResponse<?>> handleNoResource(NoResourceFoundException e) {
    return ResponseEntity
        .status(404)
        .body(ApiResponse.fail(GlobalErrorCode.NOT_FOUND));
  }

  // 500 - 그 외 예외
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<?>> handleException(Exception e) {
    log.error("Unhandled exception: ", e);
    return ResponseEntity
        .status(500)
        .body(ApiResponse.fail(GlobalErrorCode.INTERNAL_SERVER_ERROR));
  }
}
