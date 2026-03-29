package com.sallaemallae.backend.domain.notification.controller;

import com.sallaemallae.backend.domain.notification.dto.EmailSignalTargetDto;
import com.sallaemallae.backend.domain.notification.dto.SignalChangeInfo;
import com.sallaemallae.backend.domain.notification.enumtype.NotifyType;
import com.sallaemallae.backend.domain.notification.service.NotificationEmailService;
import com.sallaemallae.backend.domain.notification.service.NotificationPublishService;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import com.sallaemallae.backend.domain.user.repository.WatchlistRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
  private final NotificationEmailService notificationEmailService;
  private final StockRepository stockRepository;
  private final WatchlistRepository watchlistRepository;

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

  @PostMapping("/admin/test/signal-digest")
  public ResponseEntity<String> testSignalDigest(@RequestParam List<Long> stockIds) {
    List<SignalChangeInfo> changes = new ArrayList<>();
    for (Long stockId : stockIds) {
      Stock stock = stockRepository.findById(stockId).orElse(null);
      if (stock != null) {
        changes.add(new SignalChangeInfo(stock.getId(), stock.getName(), NotifyType.SIGNAL_BUY));
      }
    }

    if (changes.isEmpty()) {
      return ResponseEntity.ok("종목 없음");
    }

    List<EmailSignalTargetDto> targets = watchlistRepository.findEmailOptInTargetsByStockIds(stockIds);

    Map<Long, SignalChangeInfo> changeMap = changes.stream()
        .collect(java.util.stream.Collectors.toMap(SignalChangeInfo::stockId, c -> c));

    Map<String, List<SignalChangeInfo>> emailToChanges = new HashMap<>();
    for (EmailSignalTargetDto target : targets) {
      SignalChangeInfo change = changeMap.get(target.stockId());
      if (change != null) {
        emailToChanges.computeIfAbsent(target.email(), k -> new ArrayList<>()).add(change);
      }
    }

    notificationEmailService.sendSignalDigestEmails(emailToChanges);
    return ResponseEntity.ok("일괄 이메일 발송: " + emailToChanges.size() + "명");
  }
}
