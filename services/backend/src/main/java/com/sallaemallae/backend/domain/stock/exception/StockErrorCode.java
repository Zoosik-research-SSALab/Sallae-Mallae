package com.sallaemallae.backend.domain.stock.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum StockErrorCode implements ErrorCode {

  STOCK_NOT_FOUND(404, "STOCK_001", "Stock not found."),
  STOCK_MARKET_DATA_UNAVAILABLE(502, "STOCK_002", "Failed to load live market data."),
  STOCK_MARKET_INPUT_INVALID(400, "STOCK_003", "Invalid live market request."),
  STOCK_REALTIME_SUBSCRIPTION_FAILED(502, "STOCK_004", "Failed to subscribe realtime market stream.");

  private final int status;
  private final String code;
  private final String message;
}
