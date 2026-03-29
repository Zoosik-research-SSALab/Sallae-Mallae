package com.sallaemallae.backend.domain.notification.dto;

import com.sallaemallae.backend.domain.notification.enumtype.NotifyType;

public record SignalChangeInfo(Long stockId, String stockName, NotifyType signalType) {

  public String signalLabel() {
    return switch (signalType) {
      case SIGNAL_BUY -> "매수";
      case SIGNAL_SELL -> "매도";
      default -> "";
    };
  }

  public String signalColor() {
    return switch (signalType) {
      case SIGNAL_BUY -> "#E53935";
      case SIGNAL_SELL -> "#1E88E5";
      default -> "#333";
    };
  }
}
