package com.sallaemallae.backend.domain.auth.entity;

import com.sallaemallae.backend.domain.auth.enumtype.EventType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Builder;
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

  @Enumerated(EnumType.STRING)
  @Column(name = "event_type", length = 30)
  private EventType eventType;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @PrePersist
  protected void onCreate() {
    this.createdAt = OffsetDateTime.now();
  }

  @Builder
  public LoginHistory(Long userId, String attemptEmail, String ipAddress, String deviceInfo,
      boolean isSuccess, EventType eventType) {
    this.userId = userId;
    this.attemptEmail = attemptEmail;
    this.ipAddress = ipAddress;
    this.deviceInfo = deviceInfo;
    this.isSuccess = isSuccess;
    this.eventType = eventType;
  }

  // 로그인 성공 기록
  public static LoginHistory loginSuccess(Long userId, String email, String ipAddress,
      String deviceInfo) {
    return LoginHistory.builder()
        .userId(userId)
        .attemptEmail(email)
        .ipAddress(ipAddress)
        .deviceInfo(deviceInfo)
        .isSuccess(true)
        .eventType(EventType.LOGIN)
        .build();
  }

  // 로그인 실패 기록
  public static LoginHistory loginFail(Long userId, String email, String ipAddress,
      String deviceInfo) {
    return LoginHistory.builder()
        .userId(userId)
        .attemptEmail(email)
        .ipAddress(ipAddress)
        .deviceInfo(deviceInfo)
        .isSuccess(false)
        .eventType(EventType.LOGIN)
        .build();
  }

  // 소셜 로그인 성공 기록
  public static LoginHistory socialLoginSuccess(Long userId, String email, String ipAddress,
      String deviceInfo) {
    return LoginHistory.builder()
        .userId(userId)
        .attemptEmail(email)
        .ipAddress(ipAddress)
        .deviceInfo(deviceInfo)
        .isSuccess(true)
        .eventType(EventType.SOCIAL_LOGIN)
        .build();
  }

  // 회원가입 기록
  public static LoginHistory signup(Long userId, String email, String ipAddress,
      String deviceInfo) {
    return LoginHistory.builder()
        .userId(userId)
        .attemptEmail(email)
        .ipAddress(ipAddress)
        .deviceInfo(deviceInfo)
        .isSuccess(true)
        .eventType(EventType.SIGNUP)
        .build();
  }

  // 비밀번호 재설정 기록
  public static LoginHistory passwordReset(Long userId, String email, String ipAddress) {
    return LoginHistory.builder()
        .userId(userId)
        .attemptEmail(email)
        .ipAddress(ipAddress)
        .isSuccess(true)
        .eventType(EventType.PASSWORD_RESET)
        .build();
  }
}
