package com.sallaemallae.backend.domain.stock.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum StockErrorCode implements ErrorCode {

  STOCK_NOT_FOUND(404, "STOCK_001", "종목을 찾을 수 없습니다."),
  STOCK_MARKET_DATA_UNAVAILABLE(502, "STOCK_002", "실시간 시세 데이터를 불러오지 못했습니다."),
  STOCK_MARKET_INPUT_INVALID(400, "STOCK_003", "실시간 시세 요청값이 올바르지 않습니다."),
  STOCK_REALTIME_SUBSCRIPTION_FAILED(502, "STOCK_004", "실시간 시세 구독에 실패했습니다."),
  STOCK_FINANCIAL_TYPE_INVALID(400, "STOCK_005", "실적 조회 타입이 올바르지 않습니다."),
  STOCK_ANNOUNCEMENT_NOT_FOUND(404, "STOCK_006", "공시를 찾을 수 없습니다.");

  private final int status;
  private final String code;
  private final String message;
}
