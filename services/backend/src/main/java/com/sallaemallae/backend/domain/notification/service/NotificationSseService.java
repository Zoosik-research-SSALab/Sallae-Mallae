package com.sallaemallae.backend.domain.notification.service;

import com.sallaemallae.backend.global.sse.SseManager;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationSseService {

  private static final long SSE_TIMEOUT = 30 * 60 * 1000L; // 30분
  private static final String CHANNEL_PREFIX = "NOTIFICATION:";

  private final SseManager sseManager;

  /**
   * 클라이언트가 알림 SSE 스트림을 구독한다.
   */
  public SseEmitter subscribe(Long userId) {
    SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);
    String channel = CHANNEL_PREFIX + userId;

    sseManager.addEmitter(channel, emitter);

    emitter.onCompletion(() -> sseManager.removeEmitter(channel, emitter));
    emitter.onTimeout(() -> sseManager.removeEmitter(channel, emitter));
    emitter.onError(e -> sseManager.removeEmitter(channel, emitter));

    sseManager.sendToEmitter(emitter, Map.of("type", "CONNECTED"));

    return emitter;
  }

  /**
   * 특정 유저에게 새 알림 이벤트를 SSE로 전송한다.
   */
  public void pushToUser(Long userId, String notiType, String title, String message) {
    String channel = CHANNEL_PREFIX + userId;
    sseManager.broadcast(channel, Map.of(
        "type", "NEW_NOTIFICATION",
        "notiType", notiType,
        "title", title,
        "message", message
    ));
  }
}
