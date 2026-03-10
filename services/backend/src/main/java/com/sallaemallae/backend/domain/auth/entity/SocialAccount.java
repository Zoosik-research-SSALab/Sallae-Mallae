package com.sallaemallae.backend.domain.auth.entity;

import com.sallaemallae.backend.domain.auth.enumtype.AuthProvider;
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
@Table(name = "social_accounts", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"provider", "provider_account_id"})
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SocialAccount {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private AuthProvider provider;

  @Column(name = "provider_account_id", nullable = false, length = 255)
  private String providerAccountId;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @PrePersist
  protected void onCreate() {
    this.createdAt = OffsetDateTime.now();
  }

  @Builder
  public SocialAccount(Long userId, AuthProvider provider, String providerAccountId) {
    this.userId = userId;
    this.provider = provider;
    this.providerAccountId = providerAccountId;
  }

  // 소셜 계정 연동 생성
  public static SocialAccount create(Long userId, AuthProvider provider, String providerAccountId) {
    return SocialAccount.builder()
        .userId(userId)
        .provider(provider)
        .providerAccountId(providerAccountId)
        .build();
  }

  // Google 계정 연동
  public static SocialAccount google(Long userId, String providerAccountId) {
    return SocialAccount.builder()
        .userId(userId)
        .provider(AuthProvider.GOOGLE)
        .providerAccountId(providerAccountId)
        .build();
  }

  // Naver 계정 연동
  public static SocialAccount naver(Long userId, String providerAccountId) {
    return SocialAccount.builder()
        .userId(userId)
        .provider(AuthProvider.NAVER)
        .providerAccountId(providerAccountId)
        .build();
  }

  // Kakao 계정 연동
  public static SocialAccount kakao(Long userId, String providerAccountId) {
    return SocialAccount.builder()
        .userId(userId)
        .provider(AuthProvider.KAKAO)
        .providerAccountId(providerAccountId)
        .build();
  }
}
