package com.sallaemallae.backend.global.response;

import com.sallaemallae.backend.global.exception.ErrorCode;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;

@Schema(description = "API 공통 응답")
@Getter
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class ApiResponse<T> {

  @Schema(description = "성공 여부", example = "true")
  private boolean success;

  @Schema(description = "응답 데이터")
  private T data;

  @Schema(description = "에러 정보 (실패 시)")
  private ErrorResponse error;

  // 성공 응답 (데이터 없음)
  public static <T> ApiResponse<T> success() {
    ApiResponse<T> response = new ApiResponse<>();
    response.success = true;
    return response;
  }

  // 성공 응답 (데이터 있음)
  public static <T> ApiResponse<T> success(T data) {
    ApiResponse<T> response = new ApiResponse<>();
    response.success = true;
    response.data = data;
    return response;
  }

  // 실패 응답
  public static <T> ApiResponse<T> fail(ErrorCode errorCode) {
    ApiResponse<T> response = new ApiResponse<>();
    response.success = false;
    response.error = new ErrorResponse(errorCode.getCode(), errorCode.getMessage());
    return response;
  }

  // 내부 에러 응답 클래스
  @Schema(description = "에러 응답")
  @Getter
  @RequiredArgsConstructor(access = AccessLevel.PRIVATE)
  public static class ErrorResponse {
    @Schema(description = "에러 코드", example = "AUTH_001")
    private final String code;

    @Schema(description = "에러 메시지", example = "인증에 실패했습니다")
    private final String message;
  }
}
