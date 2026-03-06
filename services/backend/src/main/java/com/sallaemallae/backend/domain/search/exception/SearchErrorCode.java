package com.sallaemallae.backend.domain.search.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum SearchErrorCode implements ErrorCode {

  SEARCH_KEYWORD_INVALID(400, "SEARCH_001", "검색어가 유효하지 않습니다."),
  SEARCH_AUTH_REQUIRED(401, "SEARCH_002", "인증이 필요합니다.");

  private final int status;
  private final String code;
  private final String message;
}
