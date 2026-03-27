package com.sallaemallae.backend.domain.notification.scheduler;

import com.sallaemallae.backend.domain.notification.enumtype.NotifyType;
import com.sallaemallae.backend.domain.notification.service.NotificationPublishService;
import com.sallaemallae.backend.domain.report.entity.AiDebateReport;
import com.sallaemallae.backend.domain.report.enumtype.AiSignal;
import com.sallaemallae.backend.domain.report.repository.AiDebateReportRepository;
import com.sallaemallae.backend.domain.stock.entity.Stock;
import com.sallaemallae.backend.domain.stock.repository.StockRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TradeSignalAlertScheduler {

  private static final ZoneId KST = ZoneId.of("Asia/Seoul");

  private final AiDebateReportRepository debateReportRepository;
  private final StockRepository stockRepository;
  private final NotificationPublishService notificationPublishService;

  /**
   * 매일 20:00 KST 실행 — AI 리포트 생성 완료 후 신호 변경 감지.
   */
  @Scheduled(cron = "0 0 20 * * MON-FRI", zone = "Asia/Seoul")
  public void checkSignalChanges() {
    LocalDate today = LocalDate.now(KST);

    List<AiDebateReport> todayReports = debateReportRepository.findLatestByReportDate(today);
    if (todayReports.isEmpty()) {
      log.info("오늘자 AI 리포트 없음. date={}", today);
      return;
    }

    Map<Long, AiSignal> previousSignals = debateReportRepository
        .findPreviousLatestByReportDate(today)
        .stream()
        .collect(Collectors.toMap(AiDebateReport::getStockId, AiDebateReport::getChairmanSignal));

    int alertCount = 0;
    for (AiDebateReport todayReport : todayReports) {
      AiSignal previousSignal = previousSignals.get(todayReport.getStockId());
      AiSignal currentSignal = todayReport.getChairmanSignal();

      if (previousSignal == null || previousSignal == currentSignal) {
        continue;
      }

      NotifyType notiType = toNotifyType(currentSignal);
      if (notiType == null) {
        continue;
      }

      Stock stock = stockRepository.findById(todayReport.getStockId()).orElse(null);
      if (stock == null) {
        continue;
      }

      String signalText = translateSignal(currentSignal);
      notificationPublishService.publish(
          stock.getId(),
          notiType,
          stock.getName() + " " + signalText + " 신호",
          stock.getName() + " AI 매매신호가 " + signalText + "으로 변경되었습니다.",
          null
      );
      alertCount++;
    }

    log.info("매매신호 변경 알림 완료. date={}, alerts={}", today, alertCount);
  }

  private NotifyType toNotifyType(AiSignal signal) {
    return switch (signal) {
      case BUY -> NotifyType.SIGNAL_BUY;
      case SELL -> NotifyType.SIGNAL_SELL;
      case HOLD, STAY -> null;
    };
  }

  private String translateSignal(AiSignal signal) {
    return switch (signal) {
      case BUY -> "매수";
      case SELL -> "매도";
      case HOLD -> "보유";
      case STAY -> "관망";
    };
  }
}
