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
}
