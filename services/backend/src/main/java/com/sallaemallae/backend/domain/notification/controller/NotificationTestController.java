package com.sallaemallae.backend.domain.notification.controller;

import com.sallaemallae.backend.domain.notification.enumtype.NotifyType;
import com.sallaemallae.backend.domain.notification.service.NotificationPublishService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Profile("!prod")
@RestController
@RequiredArgsConstructor
public class NotificationTestController {

  private final NotificationPublishService notificationPublishService;

  @PostMapping("/admin/test/notification")
  public ResponseEntity<String> testPublish(
      @RequestParam Long stockId,
      @RequestParam NotifyType type) {

    String title = "";
    String message = "";
    String relatedLink = null;

    switch (type) {
      case SURGE -> {
        title = "급등 알림";
        message = "전일 대비 +5.23% 상승했습니다.";
      }
      case PLUNGE -> {
        title = "급락 알림";
        message = "전일 대비 -4.87% 하락했습니다.";
      }
      case SIGNAL_BUY -> {
        title = "AI 매매신호";
        message = "AI 매매신호가 매수로 전환되었습니다.";
      }
      case SIGNAL_SELL -> {
        title = "AI 매매신호";
        message = "AI 매매신호가 매도로 전환되었습니다.";
      }
      case ANNOUNCEMENT -> {
        title = "새 공시";
        message = "분기보고서 (2026.03)";
        relatedLink = "https://dart.fss.or.kr/example";
      }
    }

    int count = notificationPublishService.publish(stockId, type, title, message, relatedLink);
    return ResponseEntity.ok("알림 발행 완료: " + count + "명에게 전송");
  }
}
