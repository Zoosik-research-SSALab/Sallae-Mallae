package com.sallaemallae.backend.domain.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "user_agreements")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserAgreement {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "terms_id", nullable = false)
  private Long termsId;

  @Column(name = "is_agreed", nullable = false)
  private boolean isAgreed;

  @Column(name = "agreed_at")
  private OffsetDateTime agreedAt;

  @Builder
  public UserAgreement(Long userId, Long termsId, boolean isAgreed) {
    this.userId = userId;
    this.termsId = termsId;
    this.isAgreed = isAgreed;
    this.agreedAt = isAgreed ? OffsetDateTime.now() : null;
  }

  public static UserAgreement create(Long userId, Long termsId, boolean agreed) {
    return UserAgreement.builder()
        .userId(userId)
        .termsId(termsId)
        .isAgreed(agreed)
        .build();
  }
}
