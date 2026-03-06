package com.sallaemallae.backend.domain.auth.entity;

import com.sallaemallae.backend.domain.auth.enumtype.UserStatus;
import com.sallaemallae.backend.global.entity.BaseTimeEntity;
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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 255)
  private String email;

  @Column(name = "password_hash", length = 60)
  private String passwordHash;

  @Column(nullable = false, length = 20)
  private String nickname;

  @Column(name = "profile_image_url", length = 512)
  private String profileImageUrl;

  @Column(name = "is_email_opt_in", nullable = false)
  private boolean isEmailOptIn;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private UserStatus status;

  @Column(nullable = false)
  private boolean admin;

  @Column(name = "token_version", nullable = false)
  private int tokenVersion;

  @Column(name = "withdrawn_at")
  private OffsetDateTime withdrawnAt;

  @Column(name = "deleted_at")
  private OffsetDateTime deletedAt;

  @Builder
  public User(String email, String passwordHash, String nickname, String profileImageUrl,
      boolean isEmailOptIn, UserStatus status, boolean admin) {
    this.email = email;
    this.passwordHash = passwordHash;
    this.nickname = nickname;
    this.profileImageUrl = profileImageUrl;
    this.isEmailOptIn = isEmailOptIn;
    this.status = status;
    this.admin = admin;
    this.tokenVersion = 0;
  }

  // 이메일 회원가입용 정적 팩토리 메서드
  public static User createEmailUser(String email, String passwordHash, String nickname,
      boolean isEmailOptIn) {
    return User.builder()
        .email(email)
        .passwordHash(passwordHash)
        .nickname(nickname)
        .profileImageUrl("/images/default-profile.png")
        .isEmailOptIn(isEmailOptIn)
        .status(UserStatus.ACTIVE)
        .admin(false)
        .build();
  }

  // 소셜 회원가입용 정적 팩토리 메서드
  public static User createSocialUser(String email, String nickname, String profileImageUrl,
      boolean isEmailOptIn) {
    return User.builder()
        .email(email)
        .passwordHash(null)
        .nickname(nickname)
        .profileImageUrl(profileImageUrl != null ? profileImageUrl : "/images/default-profile.png")
        .isEmailOptIn(isEmailOptIn)
        .status(UserStatus.ACTIVE)
        .admin(false)
        .build();
  }

  // 비밀번호 변경
  public void changePassword(String newPasswordHash) {
    this.passwordHash = newPasswordHash;
  }

  // 토큰 버전 증가 (전체 로그아웃, 비밀번호 재설정 시)
  public void incrementTokenVersion() {
    this.tokenVersion++;
  }

  // 회원 탈퇴 처리
  public void withdraw() {
    this.status = UserStatus.WITHDRAWN;
    this.withdrawnAt = OffsetDateTime.now();
  }

  // 탈퇴 복구
  public void recover() {
    this.status = UserStatus.ACTIVE;
    this.withdrawnAt = null;
  }

  // 프로필 업데이트
  public void updateProfile(String nickname, String profileImageUrl) {
    if (nickname != null) {
      this.nickname = nickname;
    }
    if (profileImageUrl != null) {
      this.profileImageUrl = profileImageUrl;
    }
  }

  // 이메일 수신 동의 변경
  public void updateEmailOptIn(boolean isEmailOptIn) {
    this.isEmailOptIn = isEmailOptIn;
  }
}
