package com.sallaemallae.backend.domain.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "user_watchlist")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserWatchlist {

  @EmbeddedId
  private UserWatchlistId id;

  @Column(name = "is_noti_enabled", nullable = false)
  private boolean isNotiEnabled;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
