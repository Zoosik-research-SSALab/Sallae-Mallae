package com.sallaemallae.backend.domain.user.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum UserErrorCode implements ErrorCode {

  USER_NOT_FOUND(404, "USER_001", "사용자를 찾을 수 없습니다."),
  USER_DUPLICATE_EMAIL(409, "USER_002", "이미 사용 중인 이메일입니다."),
  WATCHLIST_ALREADY_EXISTS(409, "USER_003", "이미 관심종목에 등록된 종목입니다."),
  WATCHLIST_NOT_FOUND(404, "USER_004", "관심종목에 등록되지 않은 종목입니다."),
  WATCHLIST_LIMIT_EXCEEDED(400, "USER_005", "관심종목은 최대 50개까지 등록할 수 있습니다.");

  private final int status;
  private final String code;
  private final String message;
}
