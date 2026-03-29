package com.sallaemallae.backend.domain.auth.entity;

import com.sallaemallae.backend.domain.auth.enumtype.PasswordChangedBy;
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
@Table(name = "password_history")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PasswordHistory {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "password_hash", nullable = false, length = 60)
  private String passwordHash;

  @Column(name = "changed_at", nullable = false)
  private OffsetDateTime changedAt;

  @Enumerated(EnumType.STRING)
  @Column(name = "changed_by", nullable = false, length = 10)
  private PasswordChangedBy changedBy;

  @Column(name = "ip_address", length = 45)
  private String ipAddress;

  @PrePersist
  protected void onCreate() {
    this.changedAt = OffsetDateTime.now();
  }

  @Builder
  public PasswordHistory(Long userId, String passwordHash, PasswordChangedBy changedBy,
      String ipAddress) {
    this.userId = userId;
    this.passwordHash = passwordHash;
    this.changedBy = changedBy;
    this.ipAddress = ipAddress;
  }

  // 회원가입 시 최초 비밀번호 기록
  public static PasswordHistory createInitial(Long userId, String passwordHash, String ipAddress) {
    return PasswordHistory.builder()
        .userId(userId)
        .passwordHash(passwordHash)
        .changedBy(PasswordChangedBy.USER)
        .ipAddress(ipAddress)
        .build();
  }

  // 사용자 직접 변경
  public static PasswordHistory changedByUser(Long userId, String passwordHash, String ipAddress) {
    return PasswordHistory.builder()
        .userId(userId)
        .passwordHash(passwordHash)
        .changedBy(PasswordChangedBy.USER)
        .ipAddress(ipAddress)
        .build();
  }

  // 비밀번호 찾기로 변경
  public static PasswordHistory changedByReset(Long userId, String passwordHash, String ipAddress) {
    return PasswordHistory.builder()
        .userId(userId)
        .passwordHash(passwordHash)
        .changedBy(PasswordChangedBy.RESET)
        .ipAddress(ipAddress)
        .build();
  }
}
