package com.sallaemallae.backend.domain.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "user_notifications")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserNotification {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "notification_id", nullable = false)
  private Long notificationId;

  @Column(name = "is_read", nullable = false)
  private boolean isRead;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  public void markAsRead() {
    isRead = true;
  }

  public static UserNotification create(Long userId, Long notificationId) {
    UserNotification un = new UserNotification();
    un.userId = userId;
    un.notificationId = notificationId;
    un.isRead = false;
    un.createdAt = OffsetDateTime.now();
    return un;
  }
}
