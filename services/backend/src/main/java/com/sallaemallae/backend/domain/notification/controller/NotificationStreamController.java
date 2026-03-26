package com.sallaemallae.backend.domain.notification.controller;

import com.sallaemallae.backend.domain.notification.service.NotificationSseService;
import com.sallaemallae.backend.global.security.AuthenticatedUserProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Tag(name = "알림 스트림", description = "SSE 알림 실시간 스트림 API")
@RestController
@RequestMapping("/api/stream/notifications")
@RequiredArgsConstructor
public class NotificationStreamController {

  private final NotificationSseService notificationSseService;
  private final AuthenticatedUserProvider authenticatedUserProvider;

  @Operation(summary = "알림 실시간 스트림", description = "SSE를 통해 새 알림을 실시간으로 수신합니다. 인증 필요.")
  @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter streamNotifications() {
    return notificationSseService.subscribe(authenticatedUserProvider.getCurrentUserId());
  }
}
