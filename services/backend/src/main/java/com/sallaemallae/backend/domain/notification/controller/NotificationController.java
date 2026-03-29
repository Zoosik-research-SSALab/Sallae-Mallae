package com.sallaemallae.backend.domain.notification.controller;

import com.sallaemallae.backend.domain.notification.dto.NotificationItemResponse;
import com.sallaemallae.backend.domain.notification.service.NotificationService;
import com.sallaemallae.backend.global.dto.ApiResponse;
import com.sallaemallae.backend.global.dto.CursorPageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

  private final NotificationService notificationService;

  @GetMapping
  public ApiResponse<CursorPageResponse<NotificationItemResponse>> list(
      @RequestHeader(name = "X-User-Id", defaultValue = "1") Long userId,
      @RequestParam(required = false) Long cursor,
      @RequestParam(defaultValue = "6") int size
  ) {
    return ApiResponse.ok(notificationService.getNotifications(userId, cursor, size));
  }
}
