package com.sallaemallae.backend.domain.notification.enumtype;

import com.sallaemallae.backend.domain.notification.exception.NotificationErrorCode;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.util.List;
import java.util.Locale;

public enum NotificationTab {
  ALL(List.of()),
  SIGNAL(List.of(NotifyType.SIGNAL_BUY, NotifyType.SIGNAL_SELL)),
  SURGE(List.of(NotifyType.SURGE, NotifyType.PLUNGE)),
  ANNOUNCEMENT(List.of(NotifyType.ANNOUNCEMENT));

  private final List<NotifyType> notifyTypes;

  NotificationTab(List<NotifyType> notifyTypes) {
    this.notifyTypes = notifyTypes;
  }

  public List<NotifyType> getNotifyTypes() {
    return notifyTypes;
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
