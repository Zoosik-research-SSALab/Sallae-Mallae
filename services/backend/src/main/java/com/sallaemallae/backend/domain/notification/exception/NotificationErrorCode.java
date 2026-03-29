package com.sallaemallae.backend.domain.notification.exception;

import com.sallaemallae.backend.global.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum NotificationErrorCode implements ErrorCode {

  NOTIFICATION_NOT_FOUND(404, "NOTIFICATION_001", "알림 정보를 찾을 수 없습니다."),
  INVALID_NOTIFICATION_TAB(400, "NOTIFICATION_002", "유효하지 않은 알림 탭입니다."),
  NOTIFICATION_AUTH_REQUIRED(401, "NOTIFICATION_003", "인증이 필요합니다."),
  INVALID_NOTIFICATION_LIMIT(400, "NOTIFICATION_004", "유효하지 않은 알림 조회 개수입니다."),
  INVALID_NOTIFICATION_OFFSET(400, "NOTIFICATION_005", "유효하지 않은 알림 조회 시작 위치입니다.");

  private final int status;
  private final String code;
  private final String message;
}
