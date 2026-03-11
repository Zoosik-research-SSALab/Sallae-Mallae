package com.sallaemallae.backend.domain.notification.enumtype;

public enum NotifyType {
  TRADE_SIGNAL("SIGNAL"),
  SURGE_PLUNGE("SURGE"),
  ANNOUNCEMENT("ANNOUNCEMENT");

  private final String responseValue;

  NotifyType(String responseValue) {
    this.responseValue = responseValue;
  }

  public String getResponseValue() {
    return responseValue;
  }
}
