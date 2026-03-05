package com.sallaemallae.backend.domain.notification.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum NotificationErrorCode implements ErrorCode {

  NOTIFICATION_NOT_FOUND(404, "NOTIFICATION_001", "알림 정보를 찾을 수 없습니다.");

  private final int status;
  private final String code;
  private final String message;
}
