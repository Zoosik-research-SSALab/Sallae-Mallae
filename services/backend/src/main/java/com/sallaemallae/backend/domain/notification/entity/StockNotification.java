package com.sallaemallae.backend.domain.notification.entity;

import com.sallaemallae.backend.domain.notification.enumtype.NotifyType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "stock_notifications")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StockNotification {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "stock_id", nullable = false)
  private Long stockId;

  @Enumerated(EnumType.STRING)
  @Column(name = "noti_type", nullable = false, length = 30)
  private NotifyType notiType;

  @Column(nullable = false, length = 100)
  private String title;

  @Column(nullable = false, length = 512)
  private String message;

  @Column(name = "related_link", length = 255)
  private String relatedLink;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
