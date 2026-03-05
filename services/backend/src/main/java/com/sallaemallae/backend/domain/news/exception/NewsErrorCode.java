package com.sallaemallae.backend.domain.news.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum NewsErrorCode implements ErrorCode {

  NEWS_NOT_FOUND(404, "NEWS_001", "뉴스 정보를 찾을 수 없습니다.");

  private final int status;
  private final String code;
  private final String message;
}
