package com.sallaemallae.backend.domain.auth.entity;

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
@Table(name = "login_history")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LoginHistory {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id")
  private Long userId;

  @Column(name = "attempt_email", length = 255)
  private String attemptEmail;

  @Column(name = "ip_address", length = 45)
  private String ipAddress;

  @Column(name = "device_info", length = 512)
  private String deviceInfo;

  @Column(name = "is_success", nullable = false)
  private boolean isSuccess;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
