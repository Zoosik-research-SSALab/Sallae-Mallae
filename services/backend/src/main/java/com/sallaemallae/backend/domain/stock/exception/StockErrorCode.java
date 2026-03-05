package com.sallaemallae.backend.domain.stock.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum StockErrorCode implements ErrorCode {

  STOCK_NOT_FOUND(404, "STOCK_001", "종목 정보를 찾을 수 없습니다.");

  private final int status;
  private final String code;
  private final String message;
}
