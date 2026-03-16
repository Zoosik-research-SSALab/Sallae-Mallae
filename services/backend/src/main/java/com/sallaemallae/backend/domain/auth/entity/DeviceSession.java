package com.sallaemallae.backend.domain.auth.entity;

import com.sallaemallae.backend.domain.auth.enumtype.TrustLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "device_sessions",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "device_id"}))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeviceSession {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "device_id", nullable = false, length = 255)
  private String deviceId;

  @Column(name = "device_name", nullable = false, length = 255)
  private String deviceName;

  @Column(name = "device_info", length = 512)
  private String deviceInfo;

  @Column(name = "ip_address", length = 45)
  private String ipAddress;

  @Enumerated(EnumType.STRING)
  @Column(name = "trust_level", nullable = false, length = 20)
  private TrustLevel trustLevel;

  @Column(name = "login_count", nullable = false)
  private int loginCount;

  @Column(name = "last_login_at", nullable = false)
  private OffsetDateTime lastLoginAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @PrePersist
  protected void onCreate() {
    OffsetDateTime now = OffsetDateTime.now();
    this.createdAt = now;
    this.lastLoginAt = now;
  }

  @Builder
  public DeviceSession(Long userId, String deviceId, String deviceName,
      String deviceInfo, String ipAddress) {
    this.userId = userId;
    this.deviceId = deviceId;
    this.deviceName = deviceName;
    this.deviceInfo = deviceInfo;
    this.ipAddress = ipAddress;
    this.trustLevel = TrustLevel.NEW;
    this.loginCount = 1;
  }

  /**
   * 재로그인 시 세션 정보를 갱신합니다.
   * 로그인 횟수를 증가시키고, trust_level을 재계산합니다.
   */
  public void updateOnLogin(String deviceName, String deviceInfo, String ipAddress) {
    this.deviceName = deviceName;
    this.deviceInfo = deviceInfo;
    this.ipAddress = ipAddress;
    this.loginCount++;
    this.trustLevel = TrustLevel.fromLoginCount(this.loginCount);
    this.lastLoginAt = OffsetDateTime.now();
  }
}
