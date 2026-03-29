package com.sallaemallae.backend.domain.notification.scheduler;

import com.sallaemallae.backend.domain.notification.enumtype.NotifyType;
import com.sallaemallae.backend.domain.notification.service.NotificationPublishService;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.entity.StockAnnouncement;
import com.sallaemallae.backend.domain.stock.repository.StockAnnouncementRepository;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AnnouncementAlertScheduler {

  private final StockAnnouncementRepository announcementRepository;
  private final StockRepository stockRepository;
  private final NotificationPublishService notificationPublishService;

  // 마지막 체크 시점 (서버 시작 시 현재 시각 → 기존 공시는 skip)
  private volatile OffsetDateTime lastCheckedAt = OffsetDateTime.now();

  /**
   * 5분마다 새 공시를 감지하여 알림 발행.
   */
  @Scheduled(fixedRate = 300_000, initialDelay = 60_000)
  public void checkNewAnnouncements() {
    OffsetDateTime checkPoint = lastCheckedAt;
    List<StockAnnouncement> newAnnouncements =
        announcementRepository.findByCreatedAtAfterOrderByCreatedAtAsc(checkPoint);

    if (newAnnouncements.isEmpty()) {
      return;
    }

    Set<Long> stockIds = newAnnouncements.stream()
        .map(StockAnnouncement::getStockId)
        .collect(Collectors.toSet());
    Map<Long, Stock> stockMap = stockRepository.findAllById(stockIds).stream()
        .collect(Collectors.toMap(Stock::getId, s -> s));

    int alertCount = 0;
    OffsetDateTime latestCreatedAt = checkPoint;

    for (StockAnnouncement announcement : newAnnouncements) {
      Stock stock = stockMap.get(announcement.getStockId());
      if (stock == null) {
        continue;
      }

      notificationPublishService.publish(
          stock.getId(),
          NotifyType.ANNOUNCEMENT,
          stock.getName() + " 새 공시",
          "[" + stock.getName() + "] " + truncate(announcement.getTitle(), 80),
          announcement.getUrl()
      );
      alertCount++;

      if (announcement.getCreatedAt().isAfter(latestCreatedAt)) {
        latestCreatedAt = announcement.getCreatedAt();
      }
    }

    lastCheckedAt = latestCreatedAt;
    log.info("공시 알림 완료. new={}, alerts={}", newAnnouncements.size(), alertCount);
  }

  private String truncate(String text, int maxLength) {
    if (text == null) {
      return "";
    }
    return text.length() <= maxLength ? text : text.substring(0, maxLength) + "...";
  }
}
