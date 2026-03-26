package com.sallaemallae.backend.domain.notification.service;

import com.sallaemallae.backend.domain.auth.entity.User;
import com.sallaemallae.backend.domain.auth.repository.UserRepository;
import com.sallaemallae.backend.domain.notification.dto.response.NotificationActionResponse;
import com.sallaemallae.backend.domain.notification.dto.response.NotificationBulkActionResponse;
import com.sallaemallae.backend.domain.notification.dto.response.NotificationItemResponse;
import com.sallaemallae.backend.domain.notification.dto.response.NotificationListResponse;
import com.sallaemallae.backend.domain.notification.dto.response.NotificationSettingsResponse;
import com.sallaemallae.backend.domain.notification.dto.request.NotificationSettingsUpdateRequest;
import com.sallaemallae.backend.domain.notification.dto.response.NotificationUnreadCountResponse;
import com.sallaemallae.backend.domain.notification.entity.UserNotification;
import com.sallaemallae.backend.domain.notification.enumtype.NotificationTab;
import com.sallaemallae.backend.domain.notification.exception.NotificationErrorCode;
import com.sallaemallae.backend.domain.notification.repository.NotificationQueryRepository;
import com.sallaemallae.backend.domain.notification.repository.UserNotificationRepository;
import com.sallaemallae.backend.domain.storage.service.StockIconUrlResolver;
import com.sallaemallae.backend.domain.user.exception.UserErrorCode;
import com.sallaemallae.backend.global.exception.BusinessException;
import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

  private static final int RETENTION_DAYS = 30;
  private static final int MAX_UNREAD_BADGE_COUNT = 99;

  private final NotificationQueryRepository notificationQueryRepository;
  private final UserNotificationRepository userNotificationRepository;
  private final UserRepository userRepository;
  private final StockIconUrlResolver stockIconUrlResolver;

  /** 미확인 알림 수를 배지 형식으로 반환합니다. */
  @Override
  @Transactional(readOnly = true)
  public NotificationUnreadCountResponse getUnreadCount(Long userId) {
    OffsetDateTime cutoff = createRetentionCutoff();
    long unreadCount = notificationQueryRepository.countUnreadNotifications(userId, cutoff);
    return new NotificationUnreadCountResponse(formatUnreadCount(unreadCount));
  }

  /** 탭별 알림 목록을 offset/limit 기반으로 조회합니다. */
  @Override
  @Transactional(readOnly = true)
  public NotificationListResponse getNotifications(Long userId, String tab, int offset, int limit) {
    NotificationTab notificationTab = NotificationTab.from(tab);
    OffsetDateTime cutoff = createRetentionCutoff();

    // 알림 목록의 종목 아이콘 URL을 전체 URL로 변환
    java.util.List<NotificationItemResponse> items = notificationQueryRepository.findNotifications(
        userId,
        notificationTab,
        normalizeOffset(offset),
        normalizeLimit(limit),
        cutoff
    ).stream()
        .map(item -> new NotificationItemResponse(
            item.id(),
            item.notiType(),
            item.stockName(),
            item.message(),
            item.isRead(),
            item.createdAt(),
            item.stockId(),
            stockIconUrlResolver.resolve(item.iconUrl())
        ))
        .toList();
    return new NotificationListResponse(items);
  }

  /** 알림 1건을 읽음 처리합니다. */
  @Override
  @Transactional
  public NotificationActionResponse markAsRead(Long userId, Long notificationId) {
    UserNotification userNotification = getUserNotification(userId, notificationId, createRetentionCutoff());
    userNotification.markAsRead();
    return new NotificationActionResponse("읽음 처리 완료");
  }

  /** 현재 탭 범위의 알림을 전체 읽음 처리합니다. */
  @Override
  @Transactional
  public NotificationBulkActionResponse markAllAsRead(Long userId, String tab) {
    OffsetDateTime cutoff = createRetentionCutoff();
    long count = notificationQueryRepository.markAllAsRead(userId, NotificationTab.from(tab), cutoff);
    return new NotificationBulkActionResponse("전체 읽음 처리 완료", count);
  }

  /** 알림 1건을 삭제합니다. */
  @Override
  @Transactional
  public NotificationActionResponse deleteNotification(Long userId, Long notificationId) {
    UserNotification userNotification = getUserNotification(userId, notificationId, createRetentionCutoff());
    userNotificationRepository.delete(userNotification);
    return new NotificationActionResponse("삭제 완료");
  }

  /** 현재 탭 범위의 알림을 일괄 삭제합니다. */
  @Override
  @Transactional
  public NotificationBulkActionResponse deleteNotifications(Long userId, String tab) {
    OffsetDateTime cutoff = createRetentionCutoff();
    long count = notificationQueryRepository.deleteAll(userId, NotificationTab.from(tab), cutoff);
    return new NotificationBulkActionResponse("일괄 삭제 완료", count);
  }

  private UserNotification getUserNotification(Long userId, Long notificationId, OffsetDateTime cutoff) {
    UserNotification userNotification = userNotificationRepository.findByIdAndUserId(notificationId, userId)
        .orElseThrow(() -> new BusinessException(NotificationErrorCode.NOTIFICATION_NOT_FOUND));

    if (userNotification.getCreatedAt() == null || userNotification.getCreatedAt().isBefore(cutoff)) {
      throw new BusinessException(NotificationErrorCode.NOTIFICATION_NOT_FOUND);
    }
    return userNotification;
  }

  private int normalizeLimit(int limit) {
    if (limit <= 0) {
      throw new BusinessException(NotificationErrorCode.INVALID_NOTIFICATION_LIMIT);
    }
    return limit;
  }

  private int normalizeOffset(int offset) {
    if (offset < 0) {
      throw new BusinessException(NotificationErrorCode.INVALID_NOTIFICATION_OFFSET);
    }
    return offset;
  }

  private String formatUnreadCount(long unreadCount) {
    if (unreadCount > MAX_UNREAD_BADGE_COUNT) {
      return "99+";
    }
    return String.valueOf(unreadCount);
  }

  private OffsetDateTime createRetentionCutoff() {
    return OffsetDateTime.now().minusDays(RETENTION_DAYS);
  }

  @Override
  @Transactional(readOnly = true)
  public NotificationSettingsResponse getNotificationSettings(Long userId) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

    return new NotificationSettingsResponse(user.isNotiEnabled(), user.isEmailOptIn());
  }

  @Override
  @Transactional
  public NotificationSettingsResponse updateNotificationSettings(Long userId,
      NotificationSettingsUpdateRequest request) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

    if (request.isNotiEnabled() != null) {
      user.updateNotiEnabled(request.isNotiEnabled());
    }
    if (request.isEmailNotiEnabled() != null) {
      user.updateEmailOptIn(request.isEmailNotiEnabled());
    }

    return new NotificationSettingsResponse(user.isNotiEnabled(), user.isEmailOptIn());
  }
}
