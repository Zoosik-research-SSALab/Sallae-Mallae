package com.sallaemallae.backend.domain.notification.enumtype;

import com.sallaemallae.backend.domain.notification.exception.NotificationErrorCode;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.util.Locale;

public enum NotificationTab {
  ALL(null),
  SIGNAL(NotifyType.TRADE_SIGNAL),
  SURGE(NotifyType.SURGE_PLUNGE),
  ANNOUNCEMENT(NotifyType.ANNOUNCEMENT);

  private final NotifyType notifyType;

  NotificationTab(NotifyType notifyType) {
    this.notifyType = notifyType;
  }

  public NotifyType getNotifyType() {
    return notifyType;
  }

  public static NotificationTab from(String value) {
    if (value == null || value.isBlank()) {
      return ALL;
    }

    try {
      return NotificationTab.valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException e) {
      throw new BusinessException(NotificationErrorCode.INVALID_NOTIFICATION_TAB);
    }
  }
}
