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

  @Column(length = 20)
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

  @Column(name = "deleted_at")
  private OffsetDateTime deletedAt;
}
