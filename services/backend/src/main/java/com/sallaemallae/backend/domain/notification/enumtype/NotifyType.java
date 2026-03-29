package com.sallaemallae.backend.domain.notification.enumtype;

public enum NotifyType {
  SIGNAL_BUY("BUY"),
  SIGNAL_SELL("SELL"),
  SURGE("SURGE"),
  PLUNGE("PLUNGE"),
  ANNOUNCEMENT("ANNOUNCEMENT");

  private final String responseValue;

  NotifyType(String responseValue) {
    this.responseValue = responseValue;
  }

  public String getResponseValue() {
    return responseValue;
  }
}
